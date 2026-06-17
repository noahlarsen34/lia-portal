"use client";

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <label className='block'>
            <span className='text-sm font-medium text-zinc-800'>Password</span>

            <div className='relative mt-2'>
                <input
                    className='h-11 w-full rounded-md border border-zinc-300 px-3 pr-12 text-sm outline-none transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-100'
                    name="password"
                    type={showPassword ? "text": "password"}
                    autoComplete='current-password'
                    required
                />

                <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className='absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-[#c8102e]'
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <EyeOff className='h-4 w-4'/>
                    ) : (
                        <Eye className='h-4 w-4'/>
                    )}
                </button>
            </div>
        </label>
    );
}