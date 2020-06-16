import { Token } from "./token";
import { TokenType } from "./tokentype";
import Logger, { LexError } from "./logger";

export class Lexer {
    private logger: Logger;

    private source: string;
    private tokens: Token[] = [];

    private start: number = 0;
    private current: number = 0;
    private line: number = 1;
    private linestart: number = 0;

    private static keywords: { [key: string]: TokenType } = {
        lambda: TokenType.LAMBDA,
        env: TokenType.ENV,
        unbind: TokenType.UNBIND,
    };

    constructor(source: string, logger: Logger) {
        this.source = source;
        this.logger = logger;
    }

    lexTokens(): Token[] {
        while (!this.isAtEnd()) {
            this.start = this.current;
            this.scanToken();
        }
        this.start = this.current;
        if (this.tokens.length && this.tokens[this.tokens.length - 1].type !== TokenType.NEWLINE)
            this.tokens.push(this.genToken(TokenType.NEWLINE, "<newline>", false, true));
        this.tokens.push(this.genToken(TokenType.EOF, "", true));
        return this.tokens;
    }

    private scanToken() {
        let c: string = this.advance();
        switch (c) {
            case "(":
                this.addToken(TokenType.LPAREN);
                break;
            case ")":
                this.addToken(TokenType.RPAREN);
                break;
            case "L":
            case "λ":
                this.addToken(TokenType.LAMBDA);
                break;
            case ".":
                this.addToken(TokenType.DOT);
                break;
            case "=":
                this.addToken(TokenType.EQUALS);
                break;
            case " ":
            case "\t":
            case "\r":
                break;
            case "\n":
                this.addToken(TokenType.NEWLINE);
                ++this.line;
                this.linestart = this.current;
                break;
            case "#":
                this.comment();
                break;
            default:
                if (this.isLowerAlphaNumeric(c)) {
                    this.identifier();
                } else {
                    this.error(c, `Unexpected character '${c}'`);
                }
        }
    }

    private identifier() {
        while (this.isLowerAlphaNumeric(this.peek())) this.advance();

        const ident: string = this.source.substring(this.start, this.current);
        this.addToken(ident in Lexer.keywords ? Lexer.keywords[ident] : TokenType.IDENTIFIER);
    }

    private comment() {
        do this.advance();
        while (!this.isAtEnd() && this.peekNext() !== "\n");
    }

    private match(expected: string): boolean {
        if (this.isAtEnd()) return false;
        if (this.source.charAt(this.current) !== expected) return false;
        ++this.current;
        return true;
    }

    private peek(): string {
        return this.isAtEnd() ? "\0" : this.source.charAt(this.current);
    }

    private peekNext(): string {
        return this.current + 1 >= this.source.length ? "\0" : this.source.charAt(this.current + 1);
    }

    private isLowerAlphaNumeric(s: string): boolean {
        return /^[a-z0-9]$/.test(s);
    }

    private isAtEnd(): boolean {
        return this.current >= this.source.length;
    }

    private advance(): string {
        return this.source.charAt(this.current++);
    }

    private addToken(type: TokenType) {
        const lexeme: string = this.source.substring(this.start, this.current);
        this.tokens.push(this.genToken(type, lexeme === "\n" ? "<newline>" : lexeme));
    }

    private genToken(type: TokenType, lexeme: string, eof = false, newline = false): Token {
        return new Token(
            type,
            lexeme,
            this.line,
            this.start - this.linestart + 1,
            eof ? 0 : newline ? 1 : this.current - this.start
        );
    }

    private error(character: string, message: string): LexError {
        this.logger.reportError(this.genToken(TokenType.ERROR, character), message);
        return new LexError();
    }
}
