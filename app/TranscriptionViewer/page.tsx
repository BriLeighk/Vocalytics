'use client'
import dotenv from 'dotenv';
dotenv.config();

import { ChangeEvent, useState } from 'react';
import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { TranscribeClient, StartTranscriptionJobCommand, StartTranscriptionJobCommandInput, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import Header from '../Components/header';

export default function TranscriptionViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [transcriptionSegments, setTranscriptionSegments] = useState<any[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setFileName(event.target.files[0].name); // Set file name for preview
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setTranscriptionStatus('Uploading file...');
    console.log('AWS_REGION:', process.env.NEXT_PUBLIC_AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID);
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY);

    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const uploadParams: PutObjectCommandInput = {
      Bucket: 'vocalytics-bucket', // Ensure this bucket is in the same region as the Transcribe service
      Key: file.name,
      Body: file,
    };

    try {
      const data = await s3Client.send(new PutObjectCommand(uploadParams));
      setTranscriptionStatus('File uploaded successfully.');

      const transcribeClient = new TranscribeClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
        },
      });

      const params: StartTranscriptionJobCommandInput = {
        TranscriptionJobName: `transcription-${Date.now()}`,
        LanguageCode: 'en-US',
        Media: {
          MediaFileUri: `https://${uploadParams.Bucket}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${uploadParams.Key}`,
        },
        OutputBucketName: 'vocalytics-bucket', // Ensure this bucket is in the same region as the Transcribe service
      };

      await transcribeClient.send(new StartTranscriptionJobCommand(params));
      setTranscriptionStatus('Transcription in progress...');

      // Poll for status
      const checkStatus = setInterval(async () => {
        const data = await transcribeClient.send(new GetTranscriptionJobCommand({ TranscriptionJobName: params.TranscriptionJobName }));
        if (data.TranscriptionJob && data.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
          clearInterval(checkStatus);
          setTranscriptionStatus('Transcription completed!');
          // Fetch and display the transcription
          const transcriptionUrl = data.TranscriptionJob?.Transcript?.TranscriptFileUri;
          if (transcriptionUrl) {
            try {
              const response = await fetch(transcriptionUrl);
              const transcriptionData = await response.json();
              console.log('Transcription Data:', transcriptionData); // Add this line to log the transcription data
              setTranscriptionText(transcriptionData.results.transcripts[0].transcript);
              setTranscriptionSegments(transcriptionData.results.items);
            } catch (error) {
              console.error('Error fetching transcription:', error);
              setTranscriptionStatus('Error fetching transcription.');
            }
          } else {
            setTranscriptionStatus('Transcription URL is unavailable.');
          }
        } else if (data.TranscriptionJob && data.TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
          clearInterval(checkStatus);
          setTranscriptionStatus('Transcription failed.');
        }
      }, 5000);
    } catch (error: any) {
      if (error.name === 'NetworkingError') {
        setTranscriptionStatus('Network error. Please check your CORS configuration.');
      } else {
        setTranscriptionStatus('Error uploading file.');
      }
      console.error(error);
    }
  };

  const formatTime = (seconds: number) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  };

  return (
    <div className="bg-white">
      <Header/>
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
            className="srelative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>
        <div className="mx-auto max-w-2xl py-20">
          <div className="hidden sm:mb-8 flex justify-center">
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Transcription Viewer
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Upload your audio or video file to view the transcription.
              You can add comments and edit the transcription in real time.
            </p>
            <div className="mx-auto flex justify-center ml-60">
              <input type="file" onChange={handleFileChange} />
            </div>
            {fileName && (
              <p className="mt-2 text-lg text-center leading-8 text-gray-600">
                Selected file: {fileName}
              </p>
            )}
            <button onClick={handleUpload} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
              Upload
            </button>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              {transcriptionStatus}
            </p>
            {transcriptionText && (
              <div className="mt-4 text-lg leading-8 text-gray-600">
                <h2 className="text-2xl font-bold">Transcription:</h2>
                <div className="overflow-y-auto max-h-96 w-full whitespace-normal">
                  {transcriptionSegments.reduce((acc, segment, index) => {
                    const content = segment.alternatives[0].content.replace(/\n/g, ' ');
                    if (index === 0 || (index > 0 && parseFloat(segment.start_time) - parseFloat(transcriptionSegments[index - 1].start_time) >= 180)) {
                      acc.push(
                        <a href={`#`} onClick={() => {
                          const audioElement = document.getElementById('audio') as HTMLAudioElement | null;
                          if (audioElement) {
                            audioElement.currentTime = parseFloat(segment.start_time);
                          }
                        }}>
                          [{isNaN(parseFloat(segment.start_time)) ? 'Invalid time' : formatTime(parseFloat(segment.start_time))}]
                        </a>
                      );
                    }
                    acc.push(content + ' ');
                    if (content.endsWith('.') || content.endsWith('!') || content.endsWith('?')) {
                      acc.push(<br />);
                    }
                    return acc;
                  }, [])}
                </div>
              </div>
            )}
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
  )
}