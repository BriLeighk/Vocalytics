'use client'
import Header from './Components/header'
import Image from 'next/image'


export default function Home() {
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
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center"></div>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Vocalytics
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Transcribe, Annotate, Analyze.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="#"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Transcribe Now
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between max-w-3xl mx-auto p-4">
          <div className="flex-1 pr-8">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Your Audio, Insights, Made Easy.
            </h2>
            <br></br>
            {/* temp solution - to be replaced */}
            <p className="text-gray-600">
              Effortlessly transcribe your mp3 or mp4 files, highlight key moments, and generate insightful summaries. With Vocalytics, you&apos;ll unlock the full potential of your audio and video content. Our intuitive interface and powerful AI technology make it a breeze to analyze, understand, and share your valuable recordings.
            </p>
          </div>
          <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/2">
            <Image
              src="https://www.techsmith.com/blog/wp-content/uploads/2023/08/voice-over.png"
              alt="Description of your image"
              className="w-full h-auto rounded-lg shadow-md"
              width={500}
              height={300}
            />
          </div>
        </div>

        <div className="flex items-center justify-between max-w-3xl mx-auto p-4">
          <div className="flex-1 pr-8">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              How Does Vocalytics Work ?
            </h2>
            <br></br>
            {/* temp solution - to be replaced */}
            <p className="text-gray-600">
              Step 1: Upload Your File: Choose an mp3 or mp4 file from your device.
              <br />
              Step 2: Transcribe Instantly: Our powerful AI engine will quickly generate a detailed transcript.
              <br />
              Step 3: Annotate and Comment: Highlight sections and add your thoughts or questions.
              <br />
              Step 4: Generate Summary: Let our AI summarize the key points and insights.
              <br />
            </p>
          </div>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="#"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Try Vocalytics for free today !
            </a>
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