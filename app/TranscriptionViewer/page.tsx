'use client'

import { ChangeEvent, useEffect, useState } from 'react';
import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { TranscribeClient, StartTranscriptionJobCommand, StartTranscriptionJobCommandInput, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, AttributeValue } from '@aws-sdk/client-dynamodb';
import Header from '../Components/header';
import dotenv from 'dotenv'; // Load environment variables from .env file
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import userpool from '../../userpool';
dotenv.config();

export default function TranscriptionViewer() {
  const [file, setFile] = useState<File | null>(null); // The file that the user is uploading
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>(''); // The status of the transcription
  const [transcriptionText, setTranscriptionText] = useState<string>(''); // The text of the transcription
  const [transcriptionSegments, setTranscriptionSegments] = useState<any[]>([]); // The segments of the transcription
  const [progress, setProgress] = useState<boolean>(false); // The progress of the transcription
  const [error, setError] = useState<string>(''); // The error message of the transcription
  const [isError, setIsError] = useState<boolean>(false); // The error message of the transcription
  const [s3Url, setS3Url] = useState<string | null>(null); // The url of the s3 bucket
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null); // The currently highlighted segment
  const [selectedText, setSelectedText] = useState<string | null>(null); // The selected text segment
  const [comments, setComments] = useState<{ [key: string]: string }>({}); // Comments for text segments
  const [showCommentBox, setShowCommentBox] = useState<boolean>(false); // Show or hide the comment box
  const [currentComment, setCurrentComment] = useState<string>(''); // Current comment text
  const [selectionCoords, setSelectionCoords] = useState<{ x: number, y: number } | null>(null); // Coordinates of the selected text

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const user = userpool.getCurrentUser();
    if (user) {
      setIsLoggedIn(true);
      setUsername(user.getUsername());
    }
  }, []);

  // Function to handle when the user uploads a file
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]); // Set the file that the user is uploading
    } 
  };

  // Function to handle when the user clicks the upload button
  const handleUpload = async () => {
    // Check if the user is logged in
    if (!isLoggedIn) {
      setIsError(true);
      setError('You must be logged in to upload a file.');
      setTimeout(() => {
        setIsError(false);
        setError('');
      }, 3000); // Hide error after 3 seconds
      return;
    }
  
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
  
    // if the file is not selected, return a popup error message
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
  
      // Set the S3 URL
      setS3Url(`https://${uploadParams.Bucket}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${uploadParams.Key}`);
  
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
            setTranscriptionStatus('Completed');
  
            // Fetch and display the transcription
            const transcriptionUrl = data.TranscriptionJob?.Transcript?.TranscriptFileUri;
            if (transcriptionUrl) {
              try {
                const response = await fetch(transcriptionUrl);
                const transcriptionData = await response.json();
  
                setTranscriptionText(transcriptionData.results.transcripts[0].transcript);
                setTranscriptionSegments(transcriptionData.results.items);
  
                // Store transcription in DynamoDB
                const dynamoDBClient = new DynamoDBClient({
                  region: process.env.NEXT_PUBLIC_AWS_REGION,
                  credentials: {
                    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
                  },
                });
  
                const putItemParams = {
                  TableName: 'vocalytics-dbms',
                  Item: {
                    TranscriptID: { S: params.TranscriptionJobName },
                    TranscriptText: { S: transcriptionData.results.transcripts[0].transcript },
                    Segments: { S: JSON.stringify(transcriptionData.results.items) },
                    CreationDate: { S: new Date().toISOString() },
                    Username: { S: username! }, // Store the username
                    mediaID: { S: file.name },
                  } as Record<string, AttributeValue>,
                };
                await dynamoDBClient.send(new PutItemCommand(putItemParams));
              } catch (error) {
                console.error('Error storing transcription:', error);
                setTranscriptionStatus('Error storing transcription.');
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

  // Function to handle the time update of the media element
  useEffect(() => {
    // Get the media element
    const mediaElement = document.getElementById('media') as HTMLMediaElement | null;
    if (mediaElement) {
      const handleTimeUpdate = () => {
        // Get the current time
        const currentTime = mediaElement.currentTime;
        // find the segment that the current time is in
        const segment = transcriptionSegments.find((seg, idx) => {
          const nextSeg = transcriptionSegments[idx + 1]; // Get the next segment
          return parseFloat(seg.start_time) <= currentTime && (!nextSeg || parseFloat(nextSeg.start_time) > currentTime);
        });
        // If the segment is found, set the highlighted segment to the index of the segment
        if (segment) {
          const segmentIndex = transcriptionSegments.indexOf(segment);
          setHighlightedSegment(segmentIndex);
          const segmentElement = document.getElementById(`segment-${segmentIndex}`);
          if (segmentElement) {
            // Scroll the segment into view
            segmentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      };
      // Add the event listener to the media element
      mediaElement.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [transcriptionSegments]);

  const handleCommentSubmit = async () => {
    if (selectedText && currentComment) {
      const tempSelectedText = selectedText; // Store the selected text temporarily
      setComments({ ...comments, [tempSelectedText]: currentComment });
      setShowCommentBox(false);
      setCurrentComment('');
      setSelectedText(null);
      setSelectionCoords(null);

      // Store comment in DynamoDB
      const dynamoDBClient = new DynamoDBClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
        },
      });

      const putCommentParams = {
        TableName: 'vocalytics-dbms',
        Item: {
          CommentID: { S: `comment-${Date.now()}` },
          TranscriptID: { S: 'YourTranscriptID' }, // Replace with actual TranscriptID
          Text: { S: currentComment },
          Timestamp: { S: tempSelectedText },
          CreationDate: { S: new Date().toISOString() },
        },
      };
      await dynamoDBClient.send(new PutItemCommand(putCommentParams));
    }
  };

  // Function to handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionCoords({ x: rect.left, y: rect.top }); // Set both X and Y coordinates
    } else {
      setSelectedText(null);
      setSelectionCoords(null);
    }
  };

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      if (showCommentBox) {
        event.preventDefault();
      } else {
        handleTextSelection();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [showCommentBox]);

  const fetchComments = async () => {
    const dynamoDBClient = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const getItemParams = {
      TableName: 'vocalytics-dbms',
      Key: {
        TranscriptID: { S: 'YourTranscriptID' }, // Replace with actual TranscriptID
      },
    };
    const data = await dynamoDBClient.send(new GetItemCommand(getItemParams));
    if (data.Item && data.Item.Comments && data.Item.Comments.S) {
      setComments(JSON.parse(data.Item.Comments.S));
    }
  };

  // Call fetchComments when the component mounts
  useEffect(() => {
    fetchComments();
  }, []);

  return (
    <div className="bg-white">
        
        {/* Fade in and out animation for the error message */}
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

                .highlight {
                    background-color: yellow;
                }

                .timestamp {
                    color: #60a5fa; /* blue-400 */
                }

                .comment-bubble {
                    position: absolute;
                    background-color: white;
                    border: 1px solid #ccc;
                    padding: 5px;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                }

                .comment-box {
                    position: fixed;
                    right: 20px;
                    top: 20px;
                    background-color: white;
                    border: 1px solid #ccc;
                    padding: 10px;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                }

                .message-icon {
                    position: absolute;
                    cursor: pointer;
                    background-color: #60a5fa; /* blue-400 */
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .fixed.inset-0.flex.items-center.justify-center.z-50 {
                    z-index: 9999; /* Increase the z-index if necessary */
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
        <div className="relative mx-auto max-w-2xl py-20">
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
            {!progress && transcriptionStatus !== 'Completed' && (
              <p className="mt-4 text-lg leading-8 text-gray-600">
                {transcriptionStatus}
              </p>
            )}
            {/* Display the transcription text if the transcription is completed */}
            {transcriptionText && (
              <div className="mt-4 text-lg leading-8 text-gray-600">
                
                {/* Title of the transcription */}
                <h2 className="text-2xl font-bold">Transcription:</h2>
                
                {/* Embed the audio or video file */}
                {s3Url && (
                  <div className="mt-4" id="media-container">
                    {s3Url.endsWith('.mp3') ? (
                      <audio id="media" controls>
                        <source src={s3Url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <video id="media" controls>
                        <source src={s3Url} type="video/mp4" />
                        Your browser does not support the video element.
                      </video>
                    )}
                  </div>
                )}

                {/* Display the transcription text */}
                <div className="relative h-auto w-full whitespace-normal border-2 border-blue-500 rounded shadow-lg shadow-gray-600 mt-4">
                  {transcriptionSegments.reduce((acc, segment, index) => {
                    // Replace the new lines with spaces
                    const content = segment.alternatives[0].content.replace(/\n/g, ' ');
                    const startTime = parseFloat(segment.start_time);
                    // Add timestamps only at the beginning or end of a sentence
                    if (index === 0 || index % 106 === 0) {
                      if (!isNaN(startTime)) {
                        acc.push(
                          <a
                            key={`timestamp-${index}`}
                            href={`#segment-${index}`}
                            // When the timestamp is clicked, the media element will scroll to the timestamp
                            onClick={() => {
                              const mediaElement = document.getElementById('media') as HTMLMediaElement | null;
                              if (mediaElement) {
                                mediaElement.currentTime = startTime;
                                const mediaContainer = document.getElementById('media-container');
                                if (mediaContainer) {
                                  mediaContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }
                            }}
                            className="timestamp"
                          >
                            [{formatTime(startTime)}]
                          </a>
                        );
                      }
                    }
                    // Add the segment to the transcription
                    acc.push(
                      <span key={`segment-${index}`} id={`segment-${index}`} className={highlightedSegment === index ? 'highlight' : ''}>
                        {content + ' '}
                      </span>
                    );
                    // Add a new line after the segment if it ends with a period, exclamation mark, or question mark
                    if (content.endsWith('.') || content.endsWith('!') || content.endsWith('?')) {
                      acc.push(<br key={`br-${index}`} />);
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

        {/* Display the comment bubble on the side */}
        {Object.keys(comments).map((key, index) => (
          <div key={index} className="comment-bubble" style={{ top: `${index * 50}px`, right: '20px' }}>
            {comments[key]}
          </div>
        ))}

        {selectionCoords && (
          <button
            className="message-icon"
            style={{ top: selectionCoords.y + window.scrollY, right: '20px' }}
            onClick={() => {
                console.log('Chat bubble clicked');
                setShowCommentBox(true);
              }}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>
        )}

        {showCommentBox && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded shadow-lg w-1/3">
                    <textarea
                        value={currentComment}
                        onChange={(e) => setCurrentComment(e.target.value)}
                        placeholder="Add your comment"
                        className="w-full h-24 p-2 border rounded"
                    />
                    <div className="flex justify-end mt-2">
                        <button onClick={handleCommentSubmit} className="px-4 py-2 bg-blue-500 text-white rounded">
                        Submit
                        </button>
                        <button onClick={() => setShowCommentBox(false)} className="ml-2 px-4 py-2 bg-gray-500 text-white rounded">
                        Cancel
                        </button>
                    </div>
                    </div>
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