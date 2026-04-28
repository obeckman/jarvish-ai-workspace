import React from 'react';
import { Markdown } from '@/components/shared/Markdown/Markdown';

export const AskAgent = () => {
  const [input, setInput] = React.useState('');
  const [response, setResponse] = React.useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    askAgent(input);
  }
     
        
const askAgent = async (text: string) => {
  
    const res = await fetch('http://localhost:3000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });
  const data = await res.json();
  console.log("Agent says:", data.reply);
    setResponse(data.reply);

};

    return (
    <div>   
        <h1>Ask the Agent</h1>
        <form onSubmit={handleSubmit}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} />
            <button type="submit">Ask</button>
        </form>
        <div>
            <h2>Agent's Response:</h2>
            <Markdown content={response} />
        </div>
    </div>
    );
}

