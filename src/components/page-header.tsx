import React from 'react';

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
      {children && <div>{children}</div>}
    </div>
  );
}
