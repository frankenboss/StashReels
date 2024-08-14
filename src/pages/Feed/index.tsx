import React, { useEffect, useRef, useState } from "react";
import "./Feed.scss";
import VideoScroller from "../../components/VideoScroller";
import { fetchData } from "../../helpers";

interface FeedPageProps {
  query: string;
  /** The default captions language to show. `undefined` means no default
   * captions. */
  captionsDefault: string | undefined;
}

const FeedPage: React.FC<FeedPageProps> = (props) => {
  /** Get and set the raw scene data from Stash. */
  const [allSceneData, setAllSceneData] = useState<IsceneData[]>([]);

  /** Get and set the processed scene data. */
  const [allProcessedData, setAllProcessedData] = useState<IitemData[]>([]);

  /**
   * ? All scene data is fetched and from Stash on load. However, it is not
   * loaded into the scroller until the user reaches the appropriate point. This
   * reduces the amount of videos loaded at once.
   */
  useEffect(() => {
    let isMounted = true;
    fetchData(props.query).then(
      (res: { data: { findScenes: FindScenesResultType } }) => {
        if (isMounted) {
          // Process fetched scene data, filtering out invalid scenes
          const processedData = res.data.findScenes.scenes
            .map(processSceneData)
            .filter((d) => !!d);

          // Update the full scene data
          setAllSceneData(processedData);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  /** Handles fetching video data */
  const handleProcessingItemData = () => {
    // Once the scene data has been fetched, process it for use in an item.
    const processedItems: IitemData[] = allSceneData.map((sc) => {
      return {
        scene: sc,
        subtitlesOn,
        toggleAudioHandler: handleTogglingAudio,
        toggleFullscreenHandler: handleTogglingFullscreen,
        toggleLoopHandler: handleTogglingLooping,
        toggleSubtitlesHandler: handleTogglingSubtitles,
        toggleUiHandler: handleTogglingUI,
      };
    });
    setAllProcessedData(processedItems);
  };

  /* ---------------------------------- Audio --------------------------------- */

  const [isMuted, setIsMuted] = useState(true);
  const handleTogglingAudio = () => setIsMuted((prev) => !prev);

  /* ------------------------------- Fullscreen ------------------------------- */

  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef<HTMLElement>(null);

  const handleTogglingFullscreen = () => {
    if (document.fullscreenElement === null) {
      pageRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Watch for fullscreen being changed by events other than the button click.
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  /* --------------------------------- Looping -------------------------------- */

  const [loopOnEnd, setLoopOnEnd] = useState(false);
  const handleTogglingLooping = () => setLoopOnEnd((prev) => !prev);

  useEffect(() => {
    // Once scene data is loaded, process and queue it into the scroller.
    handleProcessingItemData();
  }, [allSceneData]);

  /* -------------------------------- Subtitles ------------------------------- */

  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const handleTogglingSubtitles = () => setSubtitlesOn((prev) => !prev);

  /* ----------------------------------- UI ----------------------------------- */

  const [showUI, setShowUI] = useState(true);

  const handleTogglingUI = () => {
    setShowUI((prev) => !prev);
  };

  /* -------------------------------- component ------------------------------- */
  return (
    <main data-testid="FeedPage" ref={pageRef}>
      <VideoScroller
        captionsDefault={props.captionsDefault}
        isFullscreen={isFullscreen}
        isMuted={isMuted}
        items={allProcessedData}
        loopOnEnd={loopOnEnd}
        subtitlesOn={subtitlesOn}
        uiIsVisible={showUI}
      />
    </main>
  );
};

export default FeedPage;

/** Process individual scene data from Stash to app format. */
const processSceneData = (sc: Scene): IsceneData | null => {
  if (!sc.paths.stream) return null;

  const processedData: IsceneData = {
    date: sc.date ?? undefined,
    format: sc.files[0].format,
    id: sc.id,
    parentStudio: sc.studio?.parent_studio?.name ?? undefined,
    path: sc.paths.stream,
    performers: sc.performers.map((pf) => {
      return { name: pf.name, gender: pf.gender || ("UNKNOWN" as GenderEnum) };
    }),
    studio: sc.studio?.name ?? undefined,
    title: sc.title ?? undefined,
    captions: sc.captions
      ?.map((cap) => {
        if (typeof sc.paths.caption === "string") {
          return {
            format: cap.caption_type,
            lang: cap.language_code,
            source: sc.paths.caption,
          };
        }
      })
      .filter((c) => !!c),
  };

  return processedData;
};
