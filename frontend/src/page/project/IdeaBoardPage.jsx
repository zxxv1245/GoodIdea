import { Helmet } from "react-helmet-async";
import Sticker from "../../components/ideaboard/Sticker";
import { useEffect, useCallback, useState, useRef } from "react";
import StickerModal from "../../components/ideaboard/StickerModal";
import DefaultButton from "../../components/common/DefaultButton";
import { createIdea, deleteIdea, fetchIdea, updateIdea } from "../../api/axios";
import { useParams } from "react-router-dom";

function IdeaBoardPage() {
  const param = useParams();
  const [selectedSticker, setSelectedSticker] = useState(null); // 선택된 스티커
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태
  const [scale, setScale] = useState(1); // 확대/축소 비율
  const [translate, setTranslate] = useState({ x: 0, y: 0 }); // 이동 비율
  const [spacePressed, setSpacePressed] = useState(false);
  const containerRef = useRef(null);
  const [coordinates, setCoordinates] = useState([]); // 스티커 상태
  const [isTipOpen, setIsTipOpen] = useState(false);

  // 기본 브라우저 확대/축소 막기
  useEffect(() => {
    const preventDefaultZoom = (e) => {
      if (e.ctrlKey && e.type === "wheel") {
        e.preventDefault();
      } else if (e.ctrlKey && (e.key === "=" || e.key === "-")) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", preventDefaultZoom, { passive: false });
    window.addEventListener("keydown", preventDefaultZoom, { passive: false });
    return () => {
      window.removeEventListener("wheel", preventDefaultZoom);
      window.removeEventListener("keydown", preventDefaultZoom);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 스페이스바 눌림을 감지하고, 특정 조건에서만 동작
      if (e.key === " " && !isModalOpen) {
        // 모달이 열려있을 때는 동작하지 않음
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === " ") {
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isModalOpen]); // 모달 상태에 따라 이벤트 핸들러 동작

  const fetchIdeas = useCallback(async () => {
    const data = await fetchIdea(param?.id);
    if (data) {
      setCoordinates(data);
    }
  }, [param?.id]);

  // 아이디어 목록 조회
  useEffect(() => {
    fetchIdeas();
  }, [param?.id, fetchIdeas]);

  // 스티커 클릭 시 선택 상태 변경
  const handleStickerClick = (index) => {
    const clickedSticker = coordinates[index];
    setSelectedSticker((prevSelectedSticker) =>
      prevSelectedSticker?.ideaId === clickedSticker.ideaId
        ? null
        : clickedSticker
    );
  };

  // 스티커 추가 함수
  const handleAddSticker = async () => {
    await createIdea(param?.id);
    fetchIdeas();
  };

  // 스티커 삭제 함수
  const handleDeleteSticker = async () => {
    if (selectedSticker?.ideaId) {
      await deleteIdea(selectedSticker.ideaId);

      // 서버에서 삭제 후 로컬 상태에서도 해당 스티커를 제거하여 UX 개선
      setCoordinates((prevCoordinates) =>
        prevCoordinates.filter(
          (sticker) => sticker.ideaId !== selectedSticker.ideaId
        )
      );

      setSelectedSticker(null); // 선택된 스티커 초기화
    }
  };

  // 마우스로 화면을 드래그하여 이동하는 기능
  const handleMouseDown = (e) => {
    if (!spacePressed) return; // 스페이스바가 눌린 상태에서만 화면 이동 활성화

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startTranslate = { ...translate };

    const handleMouseMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - startX) / scale) * 2;
      const dy = ((moveEvent.clientY - startY) / scale) * 2;

      const { offsetWidth: parentWidth, offsetHeight: parentHeight } =
        containerRef.current;

      const maxTranslateX = (parentWidth * scale - parentWidth) / 2;
      const maxTranslateY = (parentHeight * scale - parentHeight) / 2;

      setTranslate({
        x: Math.max(
          -maxTranslateX,
          Math.min(startTranslate.x + dx, maxTranslateX)
        ),
        y: Math.max(
          -maxTranslateY,
          Math.min(startTranslate.y + dy, maxTranslateY)
        ),
      });
    };

    // 마우스 버튼을 떼었을 때 이벤트 리스너를 제거하는 함수
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove); // 마우스 이동 이벤트 제거
      window.removeEventListener("mouseup", handleMouseUp); // 마우스 버튼 떼기 이벤트 제거
    };

    window.addEventListener("mousemove", handleMouseMove); // 마우스 이동 감지
    window.addEventListener("mouseup", handleMouseUp); // 마우스 버튼 떼기 감지
  };

  // 확대/축소를 처리하는 함수
  const handleWheel = (e) => {
    if (e.ctrlKey) {
      // ctrl 키와 함께 휠을 움직일 때만 확대/축소 적용
      const zoomIntensity = 0.2; // 확대/축소 강도
      let newScale = scale - e.deltaY * zoomIntensity * 0.01; // 스케일 조정
      newScale = Math.min(Math.max(newScale, 1), 4); // 스케일을 최소 1배, 최대 3배로 제한

      // 부모 요소의 크기를 참조하여 새 스케일에 맞는 이동 범위 설정
      const { offsetWidth: parentWidth, offsetHeight: parentHeight } =
        containerRef.current;
      const maxTranslateX = (parentWidth * newScale - parentWidth) / 2; // X축 최대 이동 범위
      const maxTranslateY = (parentHeight * newScale - parentHeight) / 2; // Y축 최대 이동 범위

      // 스케일 조정 후에도 이동 범위가 경계를 넘지 않도록 translate 값을 제한
      setTranslate((prevTranslate) => ({
        x: Math.max(-maxTranslateX, Math.min(prevTranslate.x, maxTranslateX)), // X축 경계 설정
        y: Math.max(-maxTranslateY, Math.min(prevTranslate.y, maxTranslateY)), // Y축 경계 설정
      }));

      setScale(newScale); // 확대/축소 비율 업데이트
    }
  };

  // 확대/축소 버튼 클릭 핸들러
  const handleZoom = (zoomIn) => {
    let newScale = zoomIn ? scale + 0.2 : scale - 0.2;
    newScale = Math.min(Math.max(newScale, 1), 4);
    updateTranslate(newScale);
  };

  // scale 값이 변경될 때 translate 값을 업데이트하는 함수
  const updateTranslate = (newScale) => {
    const { offsetWidth: parentWidth, offsetHeight: parentHeight } =
      containerRef.current;
    const maxTranslateX = (parentWidth * newScale - parentWidth) / 2;
    const maxTranslateY = (parentHeight * newScale - parentHeight) / 2;

    setTranslate((prevTranslate) => ({
      x: Math.max(-maxTranslateX, Math.min(prevTranslate.x, maxTranslateX)),
      y: Math.max(-maxTranslateY, Math.min(prevTranslate.y, maxTranslateY)),
    }));

    setScale(newScale);
  };

  // 드래그 종료 시 호출되는 함수
  const handleDragEnd = async (ideaId, newX, newY) => {
    const updatedCoordinates = coordinates.map((sticker) =>
      sticker.ideaId === ideaId ? { ...sticker, x: newX, y: newY } : sticker
    );

    // 상태 업데이트
    setCoordinates(updatedCoordinates);

    // 업데이트할 스티커 데이터 찾기
    const updatedSticker = updatedCoordinates.find(
      (sticker) => sticker.ideaId === ideaId
    );

    // 서버에 새로운 좌표 및 기존 데이터 업데이트 요청
    await updateIdea(ideaId, { ...updatedSticker, x: newX, y: newY });
  };

  return (
    <>
      <Helmet>
        <title>GOODIDEA - 아이디어보드</title>
      </Helmet>
      <div
        ref={containerRef}
        className={`relative overflow-hidden w-full h-full ${
          spacePressed ? "cursor-grab" : ""
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <div
          className="relative w-full h-full origin-center"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            background:
              "radial-gradient(circle, #a5a5a5 1px, transparent 1px) 0 0 / 20px 20px",
          }}
        >
          {coordinates.map((coordinate, index) => (
            <div
              className={coordinate === selectedSticker ? "z-40" : ""}
              key={coordinate.ideaId}
              style={{
                left: `${coordinate.x}%`,
                top: `${coordinate.y}%`,
                position: "absolute",
              }}
            >
              <Sticker
                key={coordinate.ideaId}
                coordinate={coordinate}
                onClick={() => handleStickerClick(index)}
                onDragEnd={handleDragEnd}
              />
              {coordinate === selectedSticker && (
                <div
                  className="absolute flex flex-row items-center space-x-2 z-10"
                  style={{
                    top: "-1rem",
                    left: "3.3rem",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded text-[8px] whitespace-nowrap z-40"
                    onClick={() => setIsModalOpen(true)}
                  >
                    상세보기
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded text-[8px] whitespace-nowrap z-40"
                    onClick={handleDeleteSticker}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* 스티커 상세 모달 */}
      {isModalOpen && selectedSticker && (
        <StickerModal
          closeModal={() => setIsModalOpen(false)}
          selectedSticker={selectedSticker}
        />
      )}
      {/* 아이디어(스티커) 추가 */}
      <DefaultButton
        onClick={handleAddSticker}
        type="button"
        text={
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12.998H13V18.998H11V12.998H5V10.998H11V4.99805H13V10.998H19V12.998Z"
              fill="white"
            />
          </svg>
        }
        className="fixed top-[11%] right-[1.6%] !px-3"
        theme="default"
      />
      {/* 확대/축소 컨트롤러 */}
      <div className="fixed right-[2%] top-[30%] -translate-y-1/2 flex flex-col items-center gap-2 bg-white rounded-lg p-2 shadow-md select-none border-2">
        <button
          onClick={() => handleZoom(true)}
          className="text-lg font-semibold text-gray-700"
          title={"ctrl을 누르고 마우스휠을 위로 굴리면 확대가 됩니다"}
        >
          +
        </button>
        <div className="relative w-1 h-24 bg-gray-300 rounded overflow-hidden">
          <div
            className="absolute bottom-0 w-full bg-blue-500 transition-all duration-200 ease-in-out"
            style={{
              height: `${((scale - 1) / 2) * 100}%`, // scale을 기반으로 높이 설정
            }}
          />
        </div>
        <button
          onClick={() => handleZoom(false)}
          className="text-lg font-semibold text-gray-700"
          title={"ctrl을 누르고 마우스휠을 아래로 굴리면 축소가 됩니다"}
        >
          -
        </button>
      </div>
      {/* 도움말 */}
      <div className="fixed right-[2.1%] top-[43%] flex">
        {isTipOpen && (
          <div className=" bg-blue-500 rounded-md p-4 text-white -translate-y-[38%]  -translate-x-10">
            <ul className="relative list-disc list-inside space-y-2">
              <li>
                Ctrl을 누르고 마우스휠을 굴리면 화면을 확대 및 축소할 수 있어요.
              </li>
              <li>
                확대 후 SpaceBar를 누르고 마우스로 화면을 끌면 화면을 움직일 수
                있어요.
              </li>
              <li>아이디어는 보드 안에서 자유롭게 위치를 변경 할 수 있어요.</li>
              <li>상세보기에서 아이디어를 채택할 수 있어요.</li>
              <li>아이디어 채택은 팀장만 가능합니다.</li>
            </ul>
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2 w-0 h-0 border-t-[17.5px] border-t-transparent border-b-[15px] border-b-transparent border-l-[35px] border-l-blue-500 -mr-[35px] "></div>
          </div>
        )}
        <div
          className=" bg-blue-500 text-white rounded-full shadow h-[28px] hover:bg-blue-600 transition translate-y-1/3"
          onMouseOver={() => {
            setIsTipOpen(true);
          }}
          onMouseOut={() => {
            setIsTipOpen(false);
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10.75 15.75H13.25V18.25H10.75V15.75Z" fill="white" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 8C10.805 8 10 9.086 10 10H8C8 8.198 9.496 6 12 6C14.496 6 16 8.142 16 10C16 11.578 14.892 12.378 14.206 12.873L14.09 12.957C13.335 13.509 13 13.823 13 14.5H11C11 12.738 12.161 11.89 12.907 11.345L12.91 11.343C13.742 10.734 14 10.503 14 10C14 9.05 13.204 8 12 8Z"
              fill="white"
            />
          </svg>
        </div>
      </div>
    </>
  );
}

export default IdeaBoardPage;
