import React from 'react';
import { Sheet, SheetProps } from './Sheet';

export interface ModalProps extends SheetProps {}

export const Modal: React.FC<ModalProps> = (props) => {
  return <Sheet {...props} />;
};
