/**
 * CodeMirror 字数统计扩展
 * 通过 StateField 维护字数，每次 update 时增量计算
 */
import { StateField, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export interface WordCount {
  chars: number;
  words: number;
  lines: number;
}

export const setWordCount = StateEffect.define<WordCount>();

export const wordCountField = StateField.define<WordCount>({
  create: () => ({ chars: 0, words: 0, lines: 0 }),
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setWordCount)) return e.value;
    }
    if (tr.docChanged) {
      const text = tr.state.doc.toString();
      return computeCount(text);
    }
    return value;
  },
});

function computeCount(text: string): WordCount {
  const lines = text.split("\n").length;
  const chars = text.length;
  // 中英文混合字数：中文按字、英文按词
  const cnChars = (text.match(/[一-龥]/g) || []).length;
  const enWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const words = cnChars + enWords;
  return { chars, words, lines };
}

export const wordCountUpdate = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const text = update.state.doc.toString();
    update.view.dispatch({ effects: setWordCount.of(computeCount(text)) });
  }
});

/** 初始化时计算一次 */
export const wordCountInit = EditorView.updateListener.of((update) => {
  // 首次创建时也算一次
  if (update.docChanged || update.startState.doc.length === 0) {
    const text = update.state.doc.toString();
    update.view.dispatch({ effects: setWordCount.of(computeCount(text)) });
  }
});
