import Image from "next/image";

export type TweetButton = {
  className?: string;
  buttonText: string;
  tweetText: string;
};

const TweetButton = ({ className, buttonText, tweetText }: TweetButton) => {
  return (
    <a
      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
        tweetText
      )}`}
      className={`block bg-[#1da1f2] text-white rounded-[100px] w-max px-[10px] py-[5px] ${className}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="mx-[5px] inline relative top-[2px]">
        <Image src="/twitter-logo-white.svg" width="16" height="16" alt="" />
      </div>
      {buttonText}
    </a>
  );
};

export default TweetButton;
