import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  decimals?: number;
}

export default function AnimatedCounter({
  value,
  prefix,
  suffix,
  className = '',
  duration = 2.5,
  decimals = 0,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(value);
  }, [value]);

  return (
    <span className={className}>
      {prefix ?? ''}{count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: true,
      })}{suffix ?? ''}
    </span>
  );
}