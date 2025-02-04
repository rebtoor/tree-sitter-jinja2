/**
 * @file Tree sitter parser for Ansible Jinja2 templates
 * @author Roberto Alfieri <me@rebtoor.com>
 * @license Apache-2
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "jinja2",

  // Whitespace and comments are extras - parsed but not in the tree
  extras: ($) => [$.comment, /\s/],

  // External scanner tokens for Jinja2 delimiters
  externals: ($) => [
    $._start_comment, // {#
    $._end_comment, // #}
    $._start_variable, // {{
    $._end_variable, // }}
    $._start_statement, // {%
    $._end_statement, // %}
  ],

  // Operator precedence rules
  precedences: ($) => [
    ["unary", "binary"],
    ["member", "call"],
    ["filter", "comparison"],
  ],

  rules: {
    // Root rule - a template is a sequence of text, comments, and blocks
    template: ($) =>
      repeat(choice($.text, $.comment, $.statement_block, $.expression_block)),

    // Raw text between Jinja2 expressions
    text: ($) => token(/[^{]+/),

    // Comments in {# #} delimiters
    comment: ($) => seq($._start_comment, /[^#}]*/, $._end_comment),

    // Variable expressions in {{ }} delimiters
    expression_block: ($) =>
      seq($._start_variable, $._expression, $._end_variable),

    // Control statements in {% %} delimiters
    statement_block: ($) =>
      seq($._start_statement, $._statement, $._end_statement),

    // All possible expressions
    _expression: ($) =>
      choice(
        $._primary_expression,
        $.unary_operation,
        $.binary_operation,
        $.comparison,
        $.member_access,
        $.filter_expression,
        $.function_call,
        $.list_expression,
        $.dict_expression,
      ),

    // Basic expressions that don't need further parsing
    _primary_expression: ($) =>
      choice($.identifier, $.string, $.number, $.boolean, $.none),

    // Basic identifier - variable names, function names, etc.
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // String literals
    string: ($) =>
      choice(
        seq('"', optional(/[^"]*/), '"'),
        seq("'", optional(/[^']*/), "'"),
      ),

    // Numbers - integers and floats
    number: ($) => /\d+(\.\d+)?/,

    // Boolean values
    boolean: ($) => choice("true", "false"),

    // None/null values
    none: ($) => choice("none", "None", "null"),

    // Unary operations (not, -)
    unary_operation: ($) =>
      prec.left("unary", seq(choice("not", "-"), $._expression)),

    // Binary operations (+, -, *, /, and, or, etc.)
    binary_operation: ($) =>
      prec.left(
        "binary",
        seq(
          $._expression,
          choice("+", "-", "*", "/", "and", "or"),
          $._expression,
        ),
      ),

    // Comparisons (==, !=, <, >, etc.)
    comparison: ($) =>
      prec.left(
        "comparison",
        seq(
          $._expression,
          choice("==", "!=", "<", ">", "<=", ">=", "in", "is"),
          $._expression,
        ),
      ),

    // Member access (foo.bar)
    member_access: ($) =>
      prec.left("member", seq($._expression, ".", $.identifier)),

    // Filter expressions (foo | default('bar'))
    filter_expression: ($) =>
      prec.left(
        "filter",
        seq(
          $._expression,
          "|",
          $.identifier,
          optional(seq("(", optional($.argument_list), ")")),
        ),
      ),

    // Function calls
    function_call: ($) =>
      prec.left("call", seq($.identifier, "(", optional($.argument_list), ")")),

    // Function/filter arguments
    argument_list: ($) => seq($._expression, repeat(seq(",", $._expression))),

    // List expressions [1, 2, 3]
    list_expression: ($) => seq("[", optional($.argument_list), "]"),

    // Dict expressions {'foo': 'bar'}
    dict_expression: ($) => seq("{", optional($.dict_items), "}"),

    // Dictionary items
    dict_items: ($) => seq($.dict_item, repeat(seq(",", $.dict_item))),

    dict_item: ($) => seq($._expression, ":", $._expression),

    // Control statements
    _statement: ($) =>
      choice(
        $.if_statement,
        $.for_statement,
        $.set_statement,
        $.include_statement,
      ),

    // If statement
    if_statement: ($) => seq("if", $._expression),

    // For loop
    for_statement: ($) => seq("for", $.identifier, "in", $._expression),

    // Set statement
    set_statement: ($) => seq("set", $.identifier, "=", $._expression),

    // Include statement
    include_statement: ($) => seq("include", $._expression),
  },
});
