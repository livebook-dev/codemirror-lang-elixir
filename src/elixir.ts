import { parser } from "lezer-elixir";
import {
  continuedIndent,
  delimitedIndent,
  flatIndent,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  LRLanguage,
  TreeIndentContext,
} from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";

/// A syntax provider based on the [Lezer Elixir parser](https://github.com/lezer-parser/elixir),
/// extended with highlighting and indentation information.
export const elixirLanguage = LRLanguage.define({
  name: "elixir",
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        "DoBlock AfterBlock ElseBlock CatchBlock RescueBlock":
          withContinuedStabClause(
            continuedIndent({
              except: /^\s*(after|else|catch|rescue|end)\b/,
            }),
          ),
        AnonymousFunction: withContinuedStabClause(
          delimitedIndent({ closing: "end", align: false }),
        ),
        Block: withContinuedStabClause(
          delimitedIndent({ closing: ")", align: false }),
        ),
        StabClause: continuedIndent(),
        List: delimitedIndent({ closing: "]", align: false }),
        Tuple: delimitedIndent({ closing: "}", align: false }),
        Bitstring: delimitedIndent({ closing: ">>", align: false }),
        Arguments: delimitedIndent({ closing: ")", align: false }),
        Map: delimitedIndent({ closing: "}", align: false }),
        "String Charlist Sigil": flatIndent,
        BinaryOperator: continuedIndent(),
        Pair: continuedIndent(),
      }),
      foldNodeProp.add({
        "DoBlock Block List Tuple Bitstring AnonymousFunction": foldInside,
        Map: foldMap,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: {
      brackets: ["(", "[", "{", "'", '"', "'''", '"""'],
      // Built-in sigils
      stringPrefixes: ["~s", "~S", "~r", "~R", "~c", "~C", "~D", "~N"],
    },
    indentOnInput: /^\s*([\}\]\)]|>>|after|else|catch|rescue|end)|.*->$/,
  },
});

function withContinuedStabClause(
  baseStrategy: (context: TreeIndentContext) => number,
) {
  return (context: TreeIndentContext) => {
    const before = context.node.childBefore(context.pos);

    // If end is being introduced, use the top-level node indentation
    if (
      context.node.lastChild?.type?.name === "end" &&
      context.textAfter.endsWith("end")
    ) {
      return context.baseIndentFor(context.node);
    }

    // If a new stab clause is introduced, we give it the same indentation
    // as the previous one
    if (
      before?.type?.name === "StabClause" &&
      context.textAfter.endsWith("->")
    ) {
      return context.baseIndentFor(before);
    }

    // If we are positioned right after a child stab clause, we keep
    // that stab clause's indentation
    if (before?.type?.name === "StabClause") {
      return context.baseIndentFor(before) + context.unit;
    }

    return baseStrategy(context);
  };
}

function foldMap(context: SyntaxNode) {
  const open = context.getChild("{");
  const close = context.getChild("}");

  if (open && close) {
    return { from: open.to, to: close.from };
  } else {
    return null;
  }
}
