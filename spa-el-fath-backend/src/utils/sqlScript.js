function splitSqlScript(source) {
  let delimiter = ';';
  let buffer = '';
  const statements = [];

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    const delimiterMatch = trimmed.match(/^DELIMITER\s+(\S+)\s*$/i);
    if (delimiterMatch) {
      delimiter = delimiterMatch[1];
      continue;
    }

    if (trimmed.startsWith('--') || trimmed.startsWith('#')) {
      continue;
    }

    buffer += `${line}\n`;
    let boundary = buffer.indexOf(delimiter);
    while (boundary !== -1) {
      const statement = buffer.slice(0, boundary).trim();
      if (statement) statements.push(statement);
      buffer = buffer.slice(boundary + delimiter.length);
      boundary = buffer.indexOf(delimiter);
    }
  }

  const remainder = buffer.trim();
  if (remainder) statements.push(remainder);
  return statements;
}

module.exports = { splitSqlScript };
