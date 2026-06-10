import React from 'react';
import { Image } from './Image';

import './style.css';

const data = [
  {
    type: 'Free',
    title: 'Add some description here',
    pay: 0,

    action: {
      title: 'buy',
    },
  },
  {
    type: 'Pro',
    title: 'Add some description here',
    pay: 10,
    isStar: true,
    action: {
      title: 'buy',
    },
  },
  {
    type: 'Enterprise',
    title: 'Add some description here',
    pay: 100,

    action: {
      title: 'buy',
    },
  },
] as Card[];

export const App = () => {
  return (
    <div>
      <Image />
      <div>Your code...</div>
      {data.map((item) => {
        return <CardItem item={item} />;
      })}
    </div>
  );
};

type Card = {
  type: string;
  title: string;
  pay: number;
  isStar?: boolean;
  action: {
    title: string;
    action: () => {} | undefined;
  };
};
interface CardItemProps {
  item: Card;
}
export const CardItem = (props: CardItemProps) => {
  const { type, pay, isStar, action } = props.item;
  return (
    <div id={`Card-${type}`} className="card-wrapper">
      <div >{type}</div>
      <div>{pay === 0 ? 'Free' : `$${pay}`}</div>
      {isStar && <strong>Popular</strong>}
      <button type="button">{action.title}</button>
    </div>
  );
};
