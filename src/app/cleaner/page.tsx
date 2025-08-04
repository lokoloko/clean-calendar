'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function CleanerLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else if (phoneNumber.length <= 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    }
    
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract digits only for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length !== 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/cleaner/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: digitsOnly }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send code');
      }

      // Store phone number in session storage for verification page
      sessionStorage.setItem('cleaner_phone', digitsOnly);
      
      toast({
        title: 'Code sent!',
        description: 'Check your phone for the verification code',
      });

      router.push('/cleaner/verify');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send verification code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GoStudioM</h1>
          <p className="text-gray-600">Cleaner Portal</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Sign in with your phone</CardTitle>
              <CardDescription>
                We'll send you a verification code to confirm your identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (US only)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="pl-10 text-lg"
                    required
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently supporting US phone numbers only
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Get Verification Code'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-4">
          Not a cleaner? <a href="/" className="text-blue-600 hover:underline">Go to main site</a>
        </p>
      </div>
    </div>
  );
}