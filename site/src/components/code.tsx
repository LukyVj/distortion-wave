import type { ReactNode } from "react";

const TOKENS =
  /(\/\/[^\n]*|<!--[\s\S]*?-->)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|function|return|async|await|new|if|else|default)\b|(<\/?[A-Za-z][\w.-]*|\/?>)/g;

export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKENS)) {
    const i = m.index ?? 0;
    if (i > last) out.push(code.slice(last, i));
    const cls = m[1] ? "tok-c" : m[2] ? "tok-s" : m[3] ? "tok-k" : "tok-t";
    out.push(
      <span key={i} className={cls}>
        {m[0]}
      </span>,
    );
    last = i + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <pre className="code" aria-label={label} tabIndex={0}>
      <code>{highlight(children)}</code>
    </pre>
  );
}
