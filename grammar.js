/**
 * @file Tree sitter parser for Ansible Jinja2 templates
 * @author Roberto Alfieri <me@rebtoor.com>
 * @license Apache-2
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'jinja2',

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($._node),

    // Text handling
    _text: $ => choice(
      /[^{#%}]+/,
      $._not
    ),
    
    _not: $ => choice(
      /[{]([^{#%]|)/,
      /([^}#%]|)[}]/,
      /([^{]|)#([^}]|)/,
      /([^{]|)%([^}]|)/
    ),

    _node: $ => choice(
      $.statement,
      $.expression,
      $.comment,
      $._text
    ),

    // Statement handling
    statement: $ => seq(
      $.statement_begin,
      $.statement_content,
      $.statement_end
    ),

    statement_begin: $ => seq(
      '{%',
      optional($.white_space_control)
    ),

    statement_end: $ => seq(
      optional($.white_space_control),
      '%}'
    ),

    statement_content: $ => seq(
      $.keyword,
      optional($._inner_text)
    ),

    // Expression handling
    expression: $ => seq(
      $.expression_begin,
      optional($._inner_text2),
      $.expression_end
    ),

    expression_begin: $ => '{{',
    expression_end: $ => '}}',

    // Object handling
    object: $ => seq(
      $._object_begin,
      optional($._inner_text2),
      $._object_end
    ),

    _object_begin: $ => '{',
    _object_end: $ => '}',

    // Comment handling
    comment: $ => seq(
      '{#',
      alias(/[^#]*/, $.comment_content),
      '#}'
    ),

    keyword: $ => choice(
      'if', 'else', 'elif', 'endif',
      'for', 'endfor', 'in',
      'while', 'endwhile',
      'block', 'endblock',
      'extends',
      'include',
      'import', 'from',
      'macro', 'endmacro',
      'call', 'endcall',
      'set', 'endset',
      'filter', 'endfilter',
      'raw', 'endraw',
      'with', 'endwith',
      'autoescape', 'endautoescape',
      'trans', 'endtrans',
      'do', 'debug',
      'pluralize'
    ),

    // Whitespace handling
    white_space_control: $ => /[-+]/,
    _white_space: $ => /\s+/,

    // Inner text rules
    _inner_text: $ => repeat1(choice(
      $.keyword,
      field('identifier', $.identifier),
      $._white_space,
      $.operator,
      $.string,
      $.object
    )),

    _inner_text2: $ => repeat1(choice(
      field('identifier', $.identifier),
      $._white_space,
      $.operator,
      $.string,
      $.object
    )),

    // Basic tokens
    identifier: $ => /[\w][\w\d_]*/,
    operator: $ => /[^\w_{#%}'"]+/,
    string: $ => choice(
      /'[^']*'/,
      /"[^"]*"/
    )
  }
});
