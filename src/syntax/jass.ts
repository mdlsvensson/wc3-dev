import type { LanguageRegistration } from 'shiki';

/** Small, project-owned TextMate grammar for classic JASS and common vJASS keywords. */
export const jass: LanguageRegistration = {
  name: 'jass',
  scopeName: 'source.jass',
  aliases: ['vjass'],
  repository: {},
  patterns: [
    { name: 'comment.line.double-slash.jass', begin: '//', end: '$' },
    { name: 'string.quoted.double.jass', begin: '"', end: '"', patterns: [{ name: 'constant.character.escape.jass', match: '\\\\.' }] },
    { name: 'string.quoted.single.jass', begin: "'", end: "'" },
    { name: 'keyword.control.jass', match: '\\b(?:function|endfunction|takes|returns|call|set|local|if|then|else|elseif|endif|loop|endloop|exitwhen|return|globals|endglobals|constant|native|type|extends|array|and|or|not|library|endlibrary|scope|endscope|struct|endstruct|method|endmethod|private|public|static|initializer|requires)\\b' },
    { name: 'storage.type.jass', match: '\\b(?:nothing|integer|real|boolean|string|code|handle|unit|player|trigger|timer|location|group|force|rect|event|boolexpr)\\b' },
    { name: 'constant.language.jass', match: '\\b(?:true|false|null)\\b' },
    { name: 'constant.numeric.jass', match: '(?:\\$[0-9A-Fa-f]+|\\b0[xX][0-9A-Fa-f]+|\\b\\d+(?:\\.\\d*)?)' },
    { name: 'entity.name.function.jass', match: '\\b[A-Za-z_]\\w*(?=\\s*\\()' },
    { name: 'keyword.operator.jass', match: '[+*/=<>!-]' },
  ],
};
