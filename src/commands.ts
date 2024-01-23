import {
  syntaxTree,
  getIndentation,
  getIndentUnit,
  indentString,
} from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";
import { StateCommand, EditorSelection } from "@codemirror/state";
import { elixirLanguage } from "./elixir";

/// This command, when invoked inside a do-block or an anonymous
/// function, inserts the closing end when applicable.
export const insertNewlineCloseEnd: StateCommand = (view) => {
  const { state, dispatch } = view;
  const tree = syntaxTree(state);
  const indentationUnit = getIndentUnit(state);

  let apply = true;

  const changes = state.changeByRange((range) => {
    if (!range.empty || !elixirLanguage.isActiveAt(state, range.from)) {
      apply = false;
      return { range };
    }

    const node = tree.resolve(range.from, -1);
    const parent = endDelimitedParent(node);

    if (parent && !checkAllClosed(parent)) {
      const indentation =
        getIndentation(state, parent.from + 1) || indentationUnit;
      const innerIndent = indentString(state, indentation);
      const outerIndent = indentString(state, indentation - indentationUnit);
      const insertPre = `\n${innerIndent}`;
      const insertPost = `\n${outerIndent}end`;
      const newPos = range.from + insertPre.length;

      return {
        range: EditorSelection.cursor(newPos),
        changes: [
          { from: range.from, to: range.to, insert: insertPre + insertPost },
        ],
      };
    }

    apply = false;
    return { range };
  });

  if (apply) {
    dispatch(
      state.update(changes, { scrollIntoView: true, userEvent: "input" }),
    );
    return true;
  } else {
    return false;
  }
};

function endDelimitedParent(node: SyntaxNode) {
  let cur: SyntaxNode | null = node;

  if (cur && cur.type.name === "do") {
    cur = cur.parent;
  }

  if (cur && cur.type.name === "Operator") {
    cur = cur.parent;
  }

  if (cur && (cur.type.name === "StabClause" || cur.type.name === "fn")) {
    cur = cur.parent;
  }

  if (cur && isEndDelimited(cur)) {
    return cur;
  } else {
    return null;
  }
}

function isEndDelimited(node: SyntaxNode) {
  return node.type.name === "DoBlock" || node.type.name === "AnonymousFunction";
}

function checkAllClosed(node: SyntaxNode) {
  let cur: SyntaxNode | null = node;

  while (cur) {
    if (isEndDelimited(cur)) {
      if (cur.lastChild?.type?.name !== "end") {
        return false;
      }
    }

    cur = cur.parent;
  }

  return true;
}
