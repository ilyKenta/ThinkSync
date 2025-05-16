'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from './context/AuthContext';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ChakraProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ChakraProvider>
  );
}