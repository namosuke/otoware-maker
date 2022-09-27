import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Layout from "../components/layout";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { useRef, useState, useEffect, useCallback } from "react";
import styles from "./styles.module.css";
import ReactTooltip from "react-tooltip";
import TweetButton from "../components/tweetButton";
import { useDropzone } from "react-dropzone";

const Home: NextPage = () => {
  const onFileInputChange =
    useRef<
      ({ target: { files } }: React.ChangeEvent<HTMLInputElement>) => void
    >();
  const fileConvert = useRef<(files: FileList) => void>();
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState("");
  const [mediaSrc, setMediaSrc] = useState("");
  const [mediaFile, setMediaFile] = useState<File>();
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [isProgress, setIsProgress] = useState(false);
  const [mediaTypeState, setMediaTypeState] = useState<"audio" | "video">(
    "audio"
  );
  const [outputName, setOutputName] = useState("");
  const [outputSize, setOutputSize] = useState(0);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const dropArea = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const onDrop = useCallback((acceptedFiles) => {
    fileConvert.current && fileConvert.current(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, isDragAccept } = useDropzone({
    accept: "audio/*, video/*",
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: false,
  });
  const [canShareFile, setCanShareFile] = useState(false);

  // https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  // FFmpeg読み込み
  useEffect(() => {
    (async () => {
      const ffmpeg = createFFmpeg({
        corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
        progress: (p) => {
          setProgressValue(p.ratio);
        },
      });
      ffmpeg.setLogger((log) => {
        setProgressMessage(log.message);
      });
      try {
        await ffmpeg.load();
      } catch (e) {
        console.error(e);
        setUnsupported(true);
        setError(e instanceof Error ? e.message : "");
      }
      fileConvert.current = async (files: FileList) => {
        if (files.length) {
          setIsProgress(true);
          const { name } = files[0];
          const ext = name.split(".").splice(-1)[0];
          const mediaType = files[0].type.split("/")[0];
          let data = await fetchFile(files[0]);
          ffmpeg.FS("writeFile", encodeURIComponent(name), data);
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
            try {
              data = ffmpeg.FS("readFile", `output.${ext}`);
            } catch (e) {}
            setMediaSrc(
              URL.createObjectURL(
                new Blob([data.buffer], { type: files[0].type })
              )
            );
            setMediaFile(
              new File([data.buffer], `音割れ${name}`, { type: files[0].type })
            );
            setOutputSize(data.byteLength);
            setOutputName(`音割れ${name}`);
          } else {
            console.log("音声ファイルか動画ファイルを指定してください");
          }
          setIsProgress(false);
        }
      };
      onFileInputChange.current = ({
        target: { files },
      }: React.ChangeEvent<HTMLInputElement>) => {
        fileConvert.current && files && fileConvert.current(files);
      };
    })();
  }, []);

  // ドラッグ＆ドロップ
  useEffect(() => {
    window.addEventListener("dragenter", () => {
      setIsDragging(true);
    });
    if (dropArea.current) {
      dropArea.current.addEventListener("dragleave", () => {
        setIsDragging(false);
      });
      dropArea.current.addEventListener("drop", () => {
        setIsDragging(false);
      });
    }
  }, []);
  useEffect(() => {
    if (dropArea.current) {
      dropArea.current.addEventListener("dragover", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (isDragging && isDragAccept && !isProgress && e.dataTransfer) {
          e.dataTransfer.dropEffect = "copy";
        } else if (e.dataTransfer) {
          e.dataTransfer.dropEffect = "none";
        }
      });
    }
  }, [isDragging, isDragAccept, isProgress]);

  // ファイルシェア機能判定
  useEffect(() => {
    setCanShareFile(
      navigator.canShare &&
        navigator.canShare({
          files: [new File(["test"], "test.txt", { type: "text/plain" })],
        })
    );
  }, []);

  return (
    <Layout>
      <Head>
        <title>音割れメーカー</title>
        <meta
          name="description"
          content="音声・動画ファイルをアップロードすることで、「音割れポッター」のように大音量で音割れしている音声・動画ファイルを生成できるWebサービスです！"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="apple-mobile-web-app-title" content="音割れメーカー" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@barley_ural" />
        <meta property="og:url" content="https://otoware-maker.vercel.app" />
        <meta property="og:title" content="音割れメーカー" />
        <meta
          property="og:description"
          content="音声・動画ファイルをアップロードすることで、「音割れポッター」のように大音量で音割れしている音声・動画ファイルを生成できるWebサービスです！"
        />
        <meta
          property="og:image"
          content="https://otoware-maker.vercel.app/ogp.jpg"
        />
      </Head>
      <div className="max-w-[400px] w-[calc(100%-100px)] mx-auto pt-[20px]">
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
        <ul className="list-disc ml-4">
          <li>
            このサイトでは、「音割れポッター」のような、大音量で音割れしている音声・動画ファイルを生成できます。
          </li>
          <li>
            下にある「音声・動画ファイルを選択」ボタンをクリックするか、音声・動画ファイルをこのページにドラッグ&ドロップしてください。
          </li>
          <li>
            ブラウザが対応していれば、変換が始まり、水色のプログレスバーが表示されます。
          </li>
          <li>変換が終わると、「ダウンロード」ボタンが表示されます。</li>
          <li>
            変換したファイルはサイト内で再生できます。その際は十分に音量を下げてから再生してください。
          </li>
        </ul>
        <TweetButton
          buttonText="ツイート"
          tweetText={"音割れメーカー\nhttps://otoware-maker.vercel.app"}
          className="my-[10px] mx-auto"
        />
      </div>
      {unsupported && (
        <div className="bg-yellow-200 text-yellow-700 font-bold p-[20px] max-w-[700px] w-[calc(100%-60px)] mx-auto rounded-[20px]">
          {error.includes("memory")
            ? "メモリが確保できず、プログラムを動かせません。このタブを閉じてもう一度開いてみたり、ブラウザを再起動したり、他のアプリを終了したりすると、動かせるかもしれません。"
            : "このブラウザでは動作しない可能性があります。別のブラウザをお試しください。"}
        </div>
      )}
      <div
        className="mt-[20px] mb-[40px] p-[20px] max-w-[700px] w-[calc(100%-60px)] mx-auto
      bg-white/80 rounded-[20px]"
      >
        {!isProgress && (
          <>
            <input
              type="file"
              accept="audio/*, video/*"
              onChange={(e) => {
                onFileInputChange.current && onFileInputChange.current(e);
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
            <div className="text-center mt-[10px]">
              または このページにドラッグ
            </div>
          </>
        )}
        <div
          {...getRootProps({
            className: isDragging
              ? isDragAccept && !isProgress
                ? "fixed inset-0 bg-black/70 p-[10px] transition duration-200 z-10"
                : "fixed inset-0 bg-black/70 transition duration-200 z-10"
              : "fixed inset-0 pointer-events-none opacity-0",
            ref: dropArea,
            style: {},
          })}
        >
          <input {...getInputProps()} />
          {isDragging && isDragAccept && !isProgress && (
            <div className="pointer-events-none w-[100%] h-[100%] rounded-[20px] border-[8px] border-blue-300 border-dashed grid place-items-center">
              <p className="text-blue-300 font-bold text-center p-[10px]">
                音声・動画ファイルをここにドロップ
              </p>
            </div>
          )}
          {(!isDragAccept || isProgress) && (
            <div className="pointer-events-none bg-yellow-200 text-yellow-800 text-center font-bold w-[100%] p-[10px]">
              {isProgress ? (
                <p>変換処理中はアップロードできません。</p>
              ) : (
                <p>音声ファイル、動画ファイル以外はアップロードできません。</p>
              )}
            </div>
          )}
        </div>
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
        {mediaSrc && mediaTypeState === "audio" && (
          <audio
            src={mediaSrc}
            muted
            controls
            className="mx-auto my-[20px]"
          ></audio>
        )}
        {mediaSrc && mediaTypeState === "video" && (
          <video
            src={mediaSrc}
            muted
            controls
            className="mx-auto my-[20px]"
          ></video>
        )}
        {canShareFile && mediaFile && (
          <button
            className="bg-[hsl(39,100%,46%)] hover:bg-[hsl(39,100%,52%)] block rounded-[5px] text-white mx-auto w-max px-[10px] py-[5px] shadow mb-5"
            onClick={() => {
              navigator.share({
                text: `#音割れメーカー で作ったよ！\n${window.location.href}`,
                files: [mediaFile],
              });
            }}
          >
            SNSで{mediaTypeState === "video" ? "動画" : "音声"}をシェア
            <div className="w-4 inline-block ml-[10px] relative top-[2px]">
              <Image src="/share-arrow.svg" alt="" height="256" width="256" />
            </div>
          </button>
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
        アップロードしたファイルはffmpeg.wasmを使用してブラウザだけで処理されており、サーバーには送信されません。
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
