# Vocalytics
NextJS app hosted on vercel.
Project for Headstarters' Hiring Hackathon, target track [Rilla](https://www.rilla.com/), aiming to create an audio transcription software that allows users to upload audio or video files to create a transcript for commenting in real time.

##Tech Stack
- **Frontend**: **React** with **Typescript**
- **UI Libraries**: [**Tailwind CSS**](https://tailwindcss.com/), [**Material-UI**](https://mui.com/material-ui/), & [**DaisyUI**](https://daisyui.com/) for styling
- **Backend**: **Node.js** with **AWS Lambda**:
  - Handle audio/video file uploads and trigger transcription
  - Process the uploaded file using AWS Transcribe and store results in DynamoDB
  - CRUD Operations on DynamoDB
  - Function to call SageMaker or GPT API for generating transcript summaries
  - Express API (for RESTful endpoint to trigger Lambda functions)
- **DBMS**: **DynamoDB** and **S3**
  - Store comments with references to specific timestamps using DynamoDB + store metadata like transcript ID, creation date, and file links.
  - S3 for file storage (uploaded audio/video files + attachments linked to comments, transcription)


## Implemented
- [x] **Transcription**: Allows user to upload media file to S3, convert to transcription through AWS transcribe (stores PK references in DynamoDB), and follow along as the media file plays (highlights text and auto scrolls).
- [x] **User Auth**: Enabled account creation and logging in with account verification through AWS Cognito.
- [x] **Dashboard**: Auto navigates to dashboard on log in, lists all user-generated transcripts with link to open transcription page.
- [ ] **Commenting**: Allow users to highlight parts of the transcript and add comments, displayed as annotations linked to the specific transcript section.
- [ ] **Editing**: Edit/modify generated transcription, pushing updates to S3.
- [ ] **Summary Generator**: Allow users to generate a summary of transcript and associated comments using AWS SageMaker (or GPT API with llama 3.1)

## Bonus Features
- [ ] **Logo Creation**: Create a logo in header component
- [ ] **Attachment Feature**: Option to attach files to comments?
- [ ] **Shared Notes Section**: shared space for users to collaboratively annotate and discuss the transcript.
- [ ] **Real-Time Collaboration**: Enable multiple users to work on the same transcript simultaneously.
- [ ] **Search & Filter**: Options to search transcripts by keywords, date, or tags.
- [ ] **Invite**: Allow users to invite others to comment/collaborate
- [ ] **Internal Users**: Notify with "accept invitation" request
- [ ] **External Users**: Email with link to register & accept invitation


