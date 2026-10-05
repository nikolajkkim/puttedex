// "Copy context" settings: what the problem view puts on the clipboard when you ask for help.
// The builders live in js/context/; this is the one place to change the wording and the size limits.

/** First line of every copied context. Edit freely. */
export const CONTEXT_FRAMING = "I'm practicing for data science internship interviews and I'm stuck on the problem below. "
  + "Help me understand what's wrong and guide me toward the answer. Don't give me the full solution unless I ask.";

export const CONTEXT_LIMITS = {
  sampleRows: 3,   // sample rows per table in the schema section
  resultRows: 15,  // rows of my last result shown as a table
  cellChars: 40,   // longer cell values are cut to this many characters
  outputChars: 2000, // characters of printed Python output copied per run
};
