// frontend/hooks/useWallet.ts

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (typeof window.ethereum === 'undefined') {
        setError('Please install MetaMask or another Web3 wallet');
        setIsConnecting(false);
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      setWalletAddress(accounts[0]);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setWalletAddress(null);
        } else {
          setWalletAddress(accounts[0]);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    // Note: MetaMask doesn't support programmatic disconnect
    // User must disconnect manually from the wallet
  };

  return {
    walletAddress,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    isConnected: !!walletAddress
  };
}
