'use client'
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react';
import userpool from '../../userpool';
import { logout } from '../Services/authenticate';
import { DynamoDBClient, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { HomeModernIcon } from '@heroicons/react/24/outline';

interface User {
  email: string;
}

interface NavigationItem {
  name: string;
  href: string;
  current: boolean;
  onClick?: () => void;
}

interface UserNavigationItem {
  name: string;
  href: string;
  onClick?: () => void;
}

const navigation: NavigationItem[] = [
  { name: 'Generate Transcript', href: '/TranscriptionViewer', current: true },
]

const userNavigation: UserNavigationItem[] = [
  { name: 'Sign out', href: '#', onClick: logout },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const Dashboard: React.FC = () => {
  const [userEmail, setUserEmail] = useState('');
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const user = userpool.getCurrentUser();
    if (user) {
      user.getSession((err: any) => {
        if (err) {
          console.error(err);
          return;
        }
        user.getUserAttributes((err, attributes) => {
          if (err) {
            console.error(err);
            return;
          }
          if (attributes) {
            const emailAttr = attributes.find(attr => attr.Name === 'email');
            if (emailAttr) {
              setUserEmail(emailAttr.Value);
              fetchTranscriptions(user.getUsername());
            }
          }
        });
      });
    } else {
      window.location.href = '/Login';
    }
  }, []);

  const fetchTranscriptions = async (username: string) => {
    const dynamoDBClient = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const queryParams = {
      TableName: 'vocalytics-dbms',
      IndexName: 'Username-index',
      KeyConditionExpression: '#username = :username',
      ExpressionAttributeNames: {
        '#username': 'Username',
      },
      ExpressionAttributeValues: {
        ':username': { S: username },
      },
    };

    try {
      const data = await dynamoDBClient.send(new QueryCommand(queryParams));
      if (data.Items) {
        setTranscriptions(data.Items);
      }
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
    }
  };

  const deleteTranscription = async (transcriptID: string) => {
    const dynamoDBClient = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const deleteParams = {
      TableName: 'vocalytics-dbms',
      Key: {
        'TranscriptID': { S: transcriptID },
      },
    };

    const s3DeleteParams = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: `transcriptions/${transcriptID}.json`,
    };

    try {
      await dynamoDBClient.send(new DeleteItemCommand(deleteParams));
      await s3Client.send(new DeleteObjectCommand(s3DeleteParams));
      
      setTranscriptions(prevTranscriptions => 
        prevTranscriptions.filter(t => t.TranscriptID.S !== transcriptID)
      );

      // Set success message
      setSuccessMessage('Transcription deleted successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
    } catch (error) {
      console.error('Error deleting transcription:', error);
    }
  };

  const user: User = {
    email: userEmail,
  }

  return (
    <>
      <div className="min-h-full">
        <Disclosure as="nav" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <div className="flex lg:flex-1">
                    <a href="/" className="-m-1.5 p-1.5">
                    <span className="sr-only">Vocalytics</span>
                    <HomeModernIcon className="h-6 w-auto text-gray-900" aria-hidden="true" />
                    </a>
                </div>
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    {navigation.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        aria-current={item.current ? 'page' : undefined}
                        className={classNames(
                          item.current ? 'bg-gray-100 text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                          'rounded-md px-3 py-2 text-sm font-medium',
                        )}
                      >
                        {item.name}
                      </a>
                    ))}
                    {userNavigation.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={classNames(
                          'text-gray-800 hover:bg-gray-100 hover:text-gray-900',
                          'rounded-md px-3 py-2 text-sm font-medium',
                        )}
                      >
                        {item.name}
                      </a>
                    ))}
                  </div>

                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6">

                  {/* Profile dropdown */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <MenuButton className="relative flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                        <span className="absolute -inset-1.5" />
                        <span className="sr-only">Open user menu</span>
                      </MenuButton>
                    </div>
                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                    >
                      {userNavigation.map((item) => (
                        <MenuItem key={item.name}>
                          <a
                            href={item.href}
                            onClick={item.onClick}
                            className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                          >
                            {item.name}
                          </a>
                        </MenuItem>
                      ))}
                    </MenuItems>
                  </Menu>
                </div>
              </div>
              <div className="-mr-2 flex md:hidden">
                {/* Mobile menu button */}
                <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md bg-gray-400 p-2 text-white hover:bg-gray-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  <Bars3Icon aria-hidden="true" className="block h-6 w-6 group-data-[open]:hidden" />
                  <XMarkIcon aria-hidden="true" className="hidden h-6 w-6 group-data-[open]:block" />
                </DisclosureButton>
              </div>
            </div>
          </div>

          <DisclosurePanel className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              {navigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as="a"
                  href={item.href}
                  aria-current={item.current ? 'page' : undefined}
                  className={classNames(
                    item.current ? 'bg-gray-100 text-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'block rounded-md px-3 py-2 text-base font-medium',
                  )}
                >
                  {item.name}
                </DisclosureButton>
              ))}
            </div>
            <div className="border-t border-gray-700 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="ml-0">
                  <div className="text-sm font-medium leading-none text-gray-400">{user.email}</div>
                </div>
                
              </div>
              <div className="mt-3 space-y-1 px-2">
                {userNavigation.map((item) => (
                  <DisclosureButton
                    key={item.name}
                    as="a"
                    href={item.href}
                    onClick={item.onClick}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-300 text-gray-800 hover:text-gray-800"
                  >
                    {item.name}
                  </DisclosureButton>
                ))}
              </div>
            </div>
          </DisclosurePanel>
        </Disclosure>

        <header className="bg-white shadow shadow-lg shadow-gray-400">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 text-center">Dashboard</h1>
          </div>
        </header>

        {showSuccessMessage && (
          <div role="alert" className="alert alert-success fade-in-out fixed bottom-4 right-4 w-auto max-h-[50px] text-center align-middle">
            <span>{successMessage}</span>
          </div>
        )}

        <main>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 h-auto">
            <h2 className="text-2xl text-gray-900 font-bold mt-10">Your Transcriptions</h2>
            <div className="shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {transcriptions.map((transcription) => (
                  <li key={transcription.TranscriptID.S} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <a href={`/TranscriptionDetail?id=${transcription.TranscriptID.S}`} className="text-lg font-semibold text-gray-900">
                        {transcription.TranscriptID.S}
                      </a>
                      <p className="text-sm text-gray-500">{new Date(transcription.CreationDate.S).toLocaleString()}</p>
                      <button
                        onClick={() => deleteTranscription(transcription.TranscriptID.S)}
                        className="ml-4 bg-red-500 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>

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
    </>
  );
}

export default Dashboard;