import { LanguageSupport, } from "@codemirror/language";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { insertNewlineCloseEnd } from "./commands";
import { elixirLanguage } from "./elixir";

export { elixirLanguage };

const elixirKeymap = [{ key: "Enter", run: insertNewlineCloseEnd }];

/// Elixir language support.
export function elixir() {
  const support = [Prec.high(keymap.of(elixirKeymap))];
  return new LanguageSupport(elixirLanguage, support);
}
