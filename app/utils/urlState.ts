import lzString from "lz-string";

export interface AnswerLogUrl {
  c: string; // correct answer
  u: string; // user answer
  i: boolean; // isCorrect
}

export interface QuizState {
  qn: string; // quiz name
  // Config: using a flexible record for different quiz settings
  config: Record<string, any>;

  // Stats
  t: number; // totalQuestions
  c: number; // correctAnswers
  w: number; // wrongAnswers
  log: AnswerLogUrl[];

  // Current question: flexible for different quiz types
  curr: Record<string, any>;
}

export function encodeQuizState(state: QuizState): string {
  const json = JSON.stringify(state);
  return lzString.compressToEncodedURIComponent(json);
}

export function decodeQuizState(encodedState: string): QuizState | null {
  try {
    const json = lzString.decompressFromEncodedURIComponent(encodedState);
    if (!json) {
      return null;
    }
    const state = JSON.parse(json) as QuizState;
    // Basic validation for the new generic structure
    if (
      state &&
      state.qn &&
      state.config &&
      state.t !== undefined &&
      state.c !== undefined &&
      state.w !== undefined &&
      state.log &&
      state.curr
    ) {
      return state;
    }
    return null;
  } catch (error) {
    console.error("Failed to decode state from URL:", error);
    return null;
  }
}
