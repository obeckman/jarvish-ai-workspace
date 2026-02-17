import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { TroopMovement } from './types';
import styles from './troop-movement-marker.module.scss';

interface TroopMovementMarkerProps {
  movement: TroopMovement;
}

const TroopMovementMarker: React.FC<TroopMovementMarkerProps> = ({ movement }) => {
  const [position, setPosition] = useState({ x: movement.origin.x, y: movement.origin.y });

  useEffect(() => {
    const updatePosition = () => {
      const now = Date.now();
      const totalDuration = movement.arrivalTime - movement.startTime;
      const elapsed = now - movement.startTime;
      
      if (elapsed >= totalDuration) {
        setPosition({ x: movement.destination.x, y: movement.destination.y });
        return;
      }

      const progress = elapsed / totalDuration;
      const x = movement.origin.x + (movement.destination.x - movement.origin.x) * progress;
      const y = movement.origin.y + (movement.destination.y - movement.origin.y) * progress;
      
      setPosition({ x, y });
      requestAnimationFrame(updatePosition);
    };

    const animationId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animationId);
  }, [movement]);

  const markerClasses = classNames(styles.troopMarker, styles[movement.type]);

  return (
    <div className={markerClasses} style={{ left: position.x, top: position.y }} title={`Troops to ${movement.destination.villageId || 'location'}`} />
  );
};

export default TroopMovementMarker;