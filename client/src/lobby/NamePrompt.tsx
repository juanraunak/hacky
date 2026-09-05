// Asked once, before you go anywhere near a party.

import { useState } from 'react';
import { animalName } from './names';
import { writeName } from './playerName';
import './name-prompt.css';

export function NamePrompt({ identity, onDone }: { identity: string; onDone: (name: string) => void }) {
  const [value, setValue] = useState('');
  const suggestion = animalName(identity || 'guest');
  const clean = value.trim().slice(0, 16);

  const commit = (name: string) => {
    const saved = writeName(name);
    onDone(saved || suggestion);
  };

  return (
    <div className="np">
      <form
        className="np-card"
        onSubmit={e => {
          e.preventDefault();
          commit(clean || suggestion);
        }}
      >
        <h2>WHAT DO WE CALL YOU?</h2>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={suggestion}
          maxLength={16}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit">{clean ? `PLAY AS ${clean.toUpperCase()}` : `PLAY AS ${suggestion.toUpperCase()}`}</button>
        <p>your friends will see this name</p>
      </form>
    </div>
  );
}

export default NamePrompt;
