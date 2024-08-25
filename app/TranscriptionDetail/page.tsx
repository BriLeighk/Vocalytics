'use client'

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Header from '../Components/header';
import dotenv from 'dotenv';
dotenv.config();

function TranscriptionDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [transcription, setTranscription] = useState<any>(null);
  const [s3Url, setS3Url] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [transcriptionSegments, setTranscriptionSegments] = useState<any[]>([]);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchTranscription(id);
    }
  }, [id]);

  const fetchTranscription = async (transcriptId: string) => {
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
        TranscriptID: { S: transcriptId },
      },
    };
  
    console.log('DynamoDB getItemParams:', getItemParams);
  
    try {
      const data = await dynamoDBClient.send(new GetItemCommand(getItemParams));
      console.log('DynamoDB response data:', data);
  
      if (data.Item) {
        setTranscription(data.Item);
        const s3Client = new S3Client({
          region: process.env.NEXT_PUBLIC_AWS_REGION,
          credentials: {
            accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
          },
        });
  
        // Fetch transcription data from S3
        const s3TranscriptionParams = {
          Bucket: 'vocalytics-bucket',
          Key: `${transcriptId}.json`, // Assuming the transcription is stored as a JSON file in S3
        };
        console.log('S3 getObjectParams:', s3TranscriptionParams);
  
        const s3TranscriptionData = await s3Client.send(new GetObjectCommand(s3TranscriptionParams));
        const transcriptionData = await s3TranscriptionData.Body?.transformToString();
        if (transcriptionData) {
          const parsedData = JSON.parse(transcriptionData);
          setTranscriptionText(parsedData.results.transcripts[0].transcript);
          setTranscriptionSegments(parsedData.results.items);
        }
  
        // Check if MediaID exists before accessing it
        if (data.Item.mediaID && data.Item.mediaID.S) {
          const mediaId = data.Item.mediaID.S;
          const s3MediaParams = {
            Bucket: 'vocalytics-bucket',
            Key: mediaId, // Use MediaID from DynamoDB
          };
          const s3MediaUrl = `https://${s3MediaParams.Bucket}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${s3MediaParams.Key}`;
          setS3Url(s3MediaUrl);
        } else {
          console.error('MediaID is missing in the DynamoDB item');
          // Query DynamoDB using mediaID-index
          const queryParams = {
            TableName: 'vocalytics-dbms',
            IndexName: 'mediaID-index',
            KeyConditionExpression: 'TranscriptID = :transcriptId',
            ExpressionAttributeValues: {
              ':transcriptId': { S: transcriptId },
            },
          };
          console.log('DynamoDB queryParams:', queryParams);
  
          try {
            const queryData = await dynamoDBClient.send(new QueryCommand(queryParams));
            console.log('DynamoDB query response data:', queryData);
  
            if (queryData.Items && queryData.Items.length > 0) {
              const mediaId = queryData.Items[0].mediaID.S;
              const s3MediaParams = {
                Bucket: 'vocalytics-bucket',
                Key: mediaId, // Use MediaID from DynamoDB
              };
              const s3MediaUrl = `https://${s3MediaParams.Bucket}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${s3MediaParams.Key}`;
              setS3Url(s3MediaUrl);
            } else {
              console.error('MediaID not found in mediaID-index');
            }
          } catch (queryError) {
            console.error('Error querying DynamoDB:', queryError);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching transcription:', error);
    }
  };
  
  // Function to format the time of the transcription segments
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
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

  if (!transcription) {
    return <div>Loading...</div>;
  }

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

                .highlight {
                    background-color: yellow;
                }

                .timestamp {
                    color: #60a5fa; /* blue-400 */
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

      <Header />
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="relative mx-auto max-w-2xl py-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {transcription.TranscriptID.S}
            </h1>
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
            <div className="mt-4 text-lg leading-8 text-gray-600">
              <h2 className="text-2xl font-bold">Transcription:</h2>
              <div className="relative h-auto w-full whitespace-normal border-2 border-blue-500 rounded shadow-lg shadow-gray-600 mt-4">
                {transcriptionSegments.reduce((acc, segment, index) => {
                  const content = segment.alternatives[0].content.replace(/\n/g, ' ');
                  const startTime = parseFloat(segment.start_time);

                  // Add timestamps only at the beginning or end of a sentence
                  if (index === 0 || index % 106 === 0) {
                    if (!isNaN(startTime)) {
                      acc.push(
                        <a
                          key={`timestamp-${index}`}
                          href={`#segment-${index}`}

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
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TranscriptionDetail() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptionDetailContent />
    </Suspense>
  );
}