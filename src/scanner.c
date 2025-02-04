#include <tree_sitter/parser.h>
#include <wctype.h>

enum TokenType {
  COMMENT_START,     // {#
  COMMENT_END,       // #}
  VARIABLE_START,    // {{
  VARIABLE_END,     // }}
  STATEMENT_START,  // {%
  STATEMENT_END     // %}
};

// Tracks the scanner's current state
typedef struct {
  bool in_comment;
  bool in_variable;
  bool in_statement;
} Scanner;

static void skip(TSLexer *lexer) { lexer->advance(lexer, true); }
static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static bool scan_delimiter(TSLexer *lexer, const char *delimiter) {
  for (size_t i = 0; delimiter[i]; i++) {
    if (lexer->lookahead != delimiter[i]) {
      return false;
    }
    advance(lexer);
  }
  return true;
}

void *tree_sitter_jinja2_external_scanner_create() {
  Scanner *scanner = calloc(1, sizeof(Scanner));
  return scanner;
}

void tree_sitter_jinja2_external_scanner_destroy(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  free(scanner);
}

void tree_sitter_jinja2_external_scanner_reset(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  scanner->in_comment = false;
  scanner->in_variable = false;
  scanner->in_statement = false;
}

unsigned tree_sitter_jinja2_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  buffer[0] = scanner->in_comment;
  buffer[1] = scanner->in_variable;
  buffer[2] = scanner->in_statement;
  return 3;
}

void tree_sitter_jinja2_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  if (length == 3) {
    scanner->in_comment = buffer[0];
    scanner->in_variable = buffer[1];
    scanner->in_statement = buffer[2];
  }
}

bool tree_sitter_jinja2_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;

  // Skip whitespace
  while (iswspace(lexer->lookahead)) {
    skip(lexer);
  }

  // Handle comment delimiters
  if (valid_symbols[COMMENT_START] && !scanner->in_comment) {
    if (lexer->lookahead == '{') {
      advance(lexer);
      if (lexer->lookahead == '#') {
        advance(lexer);
        scanner->in_comment = true;
        lexer->result_symbol = COMMENT_START;
        return true;
      }
    }
  }

  if (valid_symbols[COMMENT_END] && scanner->in_comment) {
    if (lexer->lookahead == '#') {
      advance(lexer);
      if (lexer->lookahead == '}') {
        advance(lexer);
        scanner->in_comment = false;
        lexer->result_symbol = COMMENT_END;
        return true;
      }
    }
  }

  // Handle variable delimiters
  if (valid_symbols[VARIABLE_START] && !scanner->in_variable) {
    if (lexer->lookahead == '{') {
      advance(lexer);
      if (lexer->lookahead == '{') {
        advance(lexer);
        scanner->in_variable = true;
        lexer->result_symbol = VARIABLE_START;
        return true;
      }
    }
  }

  if (valid_symbols[VARIABLE_END] && scanner->in_variable) {
    if (lexer->lookahead == '}') {
      advance(lexer);
      if (lexer->lookahead == '}') {
        advance(lexer);
        scanner->in_variable = false;
        lexer->result_symbol = VARIABLE_END;
        return true;
      }
    }
  }

  // Handle statement delimiters
  if (valid_symbols[STATEMENT_START] && !scanner->in_statement) {
    if (lexer->lookahead == '{') {
      advance(lexer);
      if (lexer->lookahead == '%') {
        advance(lexer);
        scanner->in_statement = true;
        lexer->result_symbol = STATEMENT_START;
        return true;
      }
    }
  }

  if (valid_symbols[STATEMENT_END] && scanner->in_statement) {
    if (lexer->lookahead == '%') {
      advance(lexer);
      if (lexer->lookahead == '}') {
        advance(lexer);
        scanner->in_statement = false;
        lexer->result_symbol = STATEMENT_END;
        return true;
      }
    }
  }

  return false;
}
