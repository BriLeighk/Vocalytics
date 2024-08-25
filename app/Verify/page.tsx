'use client'
import React, { useState, useEffect } from 'react';
import { Button, TextField, Typography } from '@mui/material';
import { CognitoUser } from 'amazon-cognito-identity-js';
import userpool from '../../userpool';
import Header from '../Components/header';

const Verify: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>(''); // New state for success message
  const [isSuccess, setIsSuccess] = useState<boolean>(false); // New state to control success popup visibility

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleVerify = () => {
    const user = new CognitoUser({
      Username: email,
      Pool: userpool,
    });

    user.confirmRegistration(code, true, (err, result) => {
      if (err) {
        console.log(err);
        setError(err.message);
        setIsError(true);
        setTimeout(() => setIsError(false), 3000);
        return;
      }
      console.log('Verification successful:', result);
      setSuccess('Verification successful');
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        window.location.href = '/Login';
      }, 3000);
    });
  };

  return (
    <div className="bg-white">
      <Header />
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>
        <div className="mx-auto max-w-2xl py-32 sm:py-20 lg:py-20">
          <div className="text-center" data-aos="fade-up">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Verify Account
            </h1>
            <div className='form shadow-lg shadow-gray-400 p-4 rounded-lg bg-gray-100 mt-8 h-[400px] w-[500px] mx-auto flex flex-col justify-center align-middle'>
              <div className="formfield">
                <label className='text-black font-bold text-left flex justify-start ml-2 mt-4' htmlFor="email">Email</label>
                <TextField
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="Email"
                  className='bg-white text-black rounded-lg m-1 w-full shadow-md shadow-gray-300'
                />
              </div>
              <div className='formfield'>
                <label className='text-black font-bold text-left flex justify-start ml-2 mt-4' htmlFor="code">Verification Code</label>
                <TextField
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  label="Verification Code"
                  className='bg-white text-black rounded-lg m-1 w-full shadow-md shadow-gray-300'
                />
              </div>
              <div className='formfield flex justify-end mt-10'>
                <Button className='bg-blue-500 text-white rounded-lg m-1 shadow-md shadow-gray-400' type='submit' variant='contained' onClick={handleVerify}>Verify</Button>
              </div>
            </div>
            {isError && (
              <div role="alert" className="alert alert-error fade-in-out fixed bottom-4 right-4 w-auto max-h-[50px] text-center align-middle">
                <span>{error}</span>
              </div>
            )}
            {isSuccess && (
              <div role="alert" className="alert alert-success fade-in-out fixed bottom-4 right-4 w-auto max-h-[50px] text-center align-middle">
                <span>{success}</span>
              </div>
            )}
            <style jsx>{`
              .fade-in-out {
                animation: fadeInOut 3s forwards;
              }
              @keyframes fadeInOut {
                0% { opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { opacity: 0; }
              }
            `}</style>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
        </div>
      </div>
    </div>
  );
};

export default Verify;