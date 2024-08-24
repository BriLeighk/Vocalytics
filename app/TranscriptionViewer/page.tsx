'use client'

import { ChangeEvent, useEffect, useState } from 'react';
import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { TranscribeClient, StartTranscriptionJobCommand, StartTranscriptionJobCommandInput, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import Header from '../Components/header';
import dotenv from 'dotenv'; // Load environment variables from .env file
dotenv.config();

export default function TranscriptionViewer() {
  const [file, setFile] = useState<File | null>(null); // The file that the user is uploading
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>(''); // The status of the transcription
  const [transcriptionText, setTranscriptionText] = useState<string>(''); // The text of the transcription
  const [transcriptionSegments, setTranscriptionSegments] = useState<any[]>([]); // The segments of the transcription
  const [progress, setProgress] = useState<boolean>(false); // The progress of the transcription
  const [error, setError] = useState<string>(''); // The error message of the transcription
  const [isError, setIsError] = useState<boolean>(false); // The error message of the transcription

  // Function to handle when the user uploads a file
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]); // Set the file that the user is uploading
    } 
  };

  // Function to handle when the user clicks the upload button
  const handleUpload = async () => {
    // checks if the file is of mp3 or mp4 format. Returns a popup error message if not
    if (file && (file.type !== 'audio/mpeg' && file.type !== 'video/mp4')) {
        setIsError(true);
        setError('Please upload a valid mp3 or mp4 file.');
        setTimeout(() => {
          setIsError(false);
          setError('');
        }, 3000); // Hide error after 3 seconds
        return;
      }

    //TODO: if the file is not selected, return a popup error message
    if (!file) {
      setIsError(true);
      setError('Please select a file.');
      setTimeout(() => {
        setIsError(false);
        setError('');
      }, 3000); // Hide error after 3 seconds
      return;
    }

    // Displays text while the file is being uploaded
    setTranscriptionStatus('Uploading file...');

    // creates an s3 client to upload the file to the s3 bucket
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
      },
    });

    // creates the parameters for the upload command
    const uploadParams: PutObjectCommandInput = {
      Bucket: 'vocalytics-bucket', // name of the s3 bucket we're using
      Key: file.name, // name of the file in the s3 bucket
      Body: file, // the file itself
    };

    try {
      // uploads the file to the s3 bucket
      await s3Client.send(new PutObjectCommand(uploadParams));

      // Clear the file input
      setFile(null);
      (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';

      // Tells the user the file was successfully uploaded
      setTranscriptionStatus('File uploaded successfully.');

      // creates a transcribe client to start the transcription job with AWS Transcribe API
      const transcribeClient = new TranscribeClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
        },
      });

      // creates the parameters to start transcription job command
      const params: StartTranscriptionJobCommandInput = {
        TranscriptionJobName: `transcription-${Date.now()}`,
        LanguageCode: 'en-US',
        Media: {
          MediaFileUri: `https://${uploadParams.Bucket}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${uploadParams.Key}`,
        },
        OutputBucketName: 'vocalytics-bucket', // Ensure this bucket is in the same region as the Transcribe service
      };

      // starts the transcription process
      await transcribeClient.send(new StartTranscriptionJobCommand(params));
    
      // checks the status of the transcription job smoothly
      const checkStatus = setInterval(async () => {
        const data = await transcribeClient.send(new GetTranscriptionJobCommand({ TranscriptionJobName: params.TranscriptionJobName }));
        if (data.TranscriptionJob) {
          const status = data.TranscriptionJob.TranscriptionJobStatus;
          if (status === 'COMPLETED') {
            // stops the interval of checking the status of the transcription job
            clearInterval(checkStatus);
          
          // set progress to false to mark completion
          setProgress(false);
          
          // Fetch and display the transcription
          const transcriptionUrl = data.TranscriptionJob?.Transcript?.TranscriptFileUri;
          if (transcriptionUrl) {
            try {
              const response = await fetch(transcriptionUrl);
              const transcriptionData = await response.json();

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
        } else {
          // Update progress based on the status
          if (status) {
            setProgress(true);
          }
        }
       }
      }, 1000); // Checks every second (can change to check quicker if needed)
    } catch (error: any) {
      if (error.name === 'NetworkingError') {
        setTranscriptionStatus('Network error. Please check your CORS configuration.');
      } else {
        setTranscriptionStatus('Error uploading file.');
      }
      console.error(error);
    }
  };

  // Function to format the time of the transcription segments
  const formatTime = (seconds: number) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  };


  return (
    <div className="bg-white">
        <style jsx>
            {`
                .fade-in-out {
                    animation: fadeInOut 3s forwards;
                }

                @keyframes fadeInOut {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}
        </style>
        {/* Header component to display at the top of the page for navigation */}
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
            {/* Title of the page */}
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Transcription Viewer
            </h1>
            {/* Description of the page */}
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Upload your audio or video file to view the transcription.
              You can add comments and edit the transcription in real time.
            </p>
            {/* Button to upload mp3/mp4 file */}
            <div className="flex justify-center text-gray-500 sm:w-1/2 mx-auto mt-4">
              <input className="border-2 rounded shadow-lg shadow-gray-400" type="file" onChange={handleFileChange} />
            </div>
            {/* Button to handle upload of the file */}
            <button onClick={handleUpload} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded shadow-lg shadow-gray-400">
              Upload
            </button>
            {/* Display the Progress Bar */}
            {progress && (
              <div className="mt-4">
                <progress className="progress progress-info w-56 rounded-lg"></progress>
              </div>
            )}
            {/* Display the status of the transcription */}
            {!progress && (
              <p className="mt-4 text-lg leading-8 text-gray-600">
                {transcriptionStatus}
              </p>
            )}
            {/* Display the transcription text if the transcription is completed */}
            {transcriptionText && (
              <div className="mt-4 text-lg leading-8 text-gray-600 border-2 rounded shadow-lg shadow-gray-600">
                {/* Title of the transcription */}
                <h2 className="text-2xl font-bold">Transcription:</h2>
                {/* Display the transcription text */}
                <div className="overflow-y-auto max-h-96 w-full whitespace-normal">
                  {transcriptionSegments.reduce((acc, segment, index) => {

                    // Replace the new lines with spaces
                    const content = segment.alternatives[0].content.replace(/\n/g, ' ');
                    // display time stamp at 180 second intervals
                    if (index === 0 || (index > 0 && parseFloat(segment.start_time) - parseFloat(transcriptionSegments[index - 1].start_time) >= 180)) {
                        // TODO: link to segment of the audio/video preview
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

        {isError && (
        <div role="alert" className="alert alert-info fade-in-out fixed bottom-4 right-4 w-auto max-h-[50px] text-center align-middle">
            <span>{error}</span>
        </div>
        )}

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