import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Layout from "../components/layout";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { useRef, useState, useEffect } from "react";
import styles from "./styles.module.css";
import ReactTooltip from "react-tooltip";
import TweetButton from "../components/tweetButton";

const Home: NextPage = () => {
  const onFileInputChange =
    useRef<
      ({
        target: { files },
      }: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    >();
  const [mediaSrc, setMediaSrc] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [isProgress, setIsProgress] = useState(false);
  const [mediaTypeState, setMediaTypeState] = useState<"audio" | "video">(
    "audio"
  );
  const [outputName, setOutputName] = useState("");
  const [outputSize, setOutputSize] = useState(0);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  useEffect(() => {
    (async () => {
      try {
        const ffmpeg = createFFmpeg({
          corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
          logger: (log) => {
            setProgressMessage(log.message);
          },
          progress: (p) => {
            setProgressValue(p.ratio);
          },
        });
        await ffmpeg.load();
        onFileInputChange.current = async ({
          target: { files },
        }: React.ChangeEvent<HTMLInputElement>) => {
          if (files) {
            setIsProgress(true);
            const { name } = files[0];
            const ext = name.split(".").splice(-1)[0];
            const mediaType = files[0].type.split("/")[0];
            ffmpeg.FS(
              "writeFile",
              encodeURIComponent(name),
              await fetchFile(files[0])
            );
            if (mediaType === "audio" || mediaType === "video") {
              if (mediaType === "audio") {
                await ffmpeg.run(
                  "-i",
                  encodeURIComponent(name),
                  "-af",
                  "volume=91dB",
                  "-c:a",
                  "pcm_s16le",
                  "step1.wav"
                );
                await ffmpeg.run("-i", "step1.wav", `output.${ext}`);
                setMediaTypeState("audio");
              } else if (mediaType === "video") {
                await ffmpeg.run(
                  "-i",
                  encodeURIComponent(name),
                  "-vn",
                  "-af",
                  "volume=91dB",
                  "-c:a",
                  "pcm_s16le",
                  "step1.wav"
                );
                await ffmpeg.run(
                  "-i",
                  encodeURIComponent(name),
                  "-i",
                  "step1.wav",
                  "-c:v",
                  "copy",
                  "-c:a",
                  "aac",
                  "-map",
                  "0:v:0",
                  "-map",
                  "1:a:0",
                  `output.${ext}`
                );
                setMediaTypeState("video");
              }
              const data = ffmpeg.FS("readFile", `output.${ext}`);
              setMediaSrc(
                URL.createObjectURL(
                  new Blob([data.buffer], { type: files[0].type })
                )
              );
              setOutputSize(data.byteLength);
              setOutputName(`音割れ${name}`);
            } else {
              console.log("音声ファイルか動画ファイルを指定してください");
            }
            setIsProgress(false);
          }
        };
      } catch (e) {
        alert(e);
      }
    })();
  }, []);

  return (
    <Layout>
      <Head>
        <title>TOP</title>
      </Head>
      <div className="max-w-[400px] w-[calc(100%-40px)] mx-auto pt-[20px]">
        <Image
          src="/logo.png"
          alt="音割れメーカーのロゴ"
          width="1219"
          height="791"
        />
      </div>
      <div
        className="mt-[40px] mb-[40px] p-[20px] max-w-[700px] w-[calc(100%-60px)] mx-auto
      bg-white/80 rounded-[20px]"
      >
        <h2 className="font-bold text-lg text-center">使い方</h2>
        　音声・動画ファイルをアップロードすることで、「音割れポッター」のように大音量で音割れしている音声・動画ファイルを生成できます。
        <br />
        　再生する際は、十分に音量を下げてから再生してください。
        <TweetButton
          buttonText="ツイート"
          tweetText={"音割れメーカー\nhttps://otoware-maker.vercel.app"}
          className="my-[10px] mx-auto"
        />
      </div>
      <div
        className="mt-[40px] mb-[40px] p-[20px] max-w-[700px] w-[calc(100%-60px)] mx-auto
      bg-white/80 rounded-[20px]"
      >
        <input
          type="file"
          accept="audio/*, video/*"
          onChange={(e) => {
            if (onFileInputChange.current) onFileInputChange.current(e);
          }}
          hidden
          ref={inputFileRef}
        />
        <button
          className="bg-gray-200 hover:bg-gray-300 border border-solid border-gray-500 rounded-[2px] px-[10px] py-[5px] block mx-auto"
          onClick={() => {
            inputFileRef.current?.click();
          }}
        >
          音声・動画ファイルを選択
        </button>
        {isProgress && (
          <>
            <div className="text-xs overflow-hidden w-[100%] text-gray-600 text-center mt-[20px] whitespace-nowrap overflow-ellipsis">
              {progressMessage}
            </div>
            <progress
              className={styles.progress}
              value={progressValue}
            ></progress>
          </>
        )}
        {mediaTypeState === "audio" && (
          <audio
            src={mediaSrc}
            muted
            controls
            className="mx-auto my-[20px]"
          ></audio>
        )}
        {mediaTypeState === "video" && (
          <video
            src={mediaSrc}
            muted
            controls
            className="mx-auto my-[20px]"
          ></video>
        )}
        {mediaSrc && (
          <a
            data-tip={`${outputName} (${formatBytes(outputSize)})`}
            href={mediaSrc}
            download={outputName}
            className="bg-[hsl(210,100%,54%)] hover:bg-[hsl(210,100%,60%)] block rounded-[5px] text-white mx-auto w-max px-[10px] py-[5px] shadow"
          >
            ダウンロード
            <div className="w-4 inline-block ml-[10px] relative top-[2px]">
              <Image src="/download.svg" alt="" height="256" width="256" />
            </div>
            <ReactTooltip effect="solid" type="light" />
          </a>
        )}
      </div>
      <div className="mt-[20px] mb-[40px] max-w-[700px] w-[calc(100%-60px)] mx-auto text-black text-xs">
        アップロードしたファイルはブラウザで処理されており、サーバーには送信されません。
        <br />
        運営者：
        <a
          href="https://twitter.com/barley_ural"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[blue]"
        >
          barley_ural
        </a>
      </div>
    </Layout>
  );
};

export default Home;
