import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import DefaultButton from "../components/common/DefaultButton";
import Divier from "../components/common/Divier";
import ProjectListItem from "../components/projectlist/ProjectLIstItem";
import Select from "../components/projectlist/Select";
import PortalModal from "../components/common/PortalModal";
import CreateProject from "../components/projectlist/CreateProject";
import { useProjectListStore } from "../store/useProjectListStore";
import { fetchGitlabProjectList, fetchProjectList } from "../api/axios";
import ProjectListItemSkeleton from "../components/skeleton/ProjectListItemSkeleton";
import UpdateUser from "../components/projectlist/UpdateUser";
import { useUserStore } from "../store/useUserStore";
import { NOW_MAX_GRADE } from "../global";

function ProjectListPage() {
  const [loading, setLoading] = useState(true);
  const [filter1, setFilter1] = useState({ value: "ALL", showOptions: false });
  const [filter2, setFilter2] = useState({ value: "ALL", showOptions: false });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const { projects } = useProjectListStore();
  const { userInfo } = useUserStore();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const gitlabProjectList = await fetchGitlabProjectList();
        const projectList = await fetchProjectList();
        if (gitlabProjectList && projectList) {
          useProjectListStore.setState({
            projects: [...projectList],
          });
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (
      userInfo.name === null ||
      userInfo.locationType === null ||
      userInfo.grade === null
    ) {
      setIsUpdateModalOpen(true);
    }
  }, [userInfo.name, userInfo.locationType, userInfo.grade]);

  // filter change useEffect get fetch fetchProjectList
  useEffect(() => {
    const changeFilter = async () => {
      try {
        setLoading(true);
        const projectList = await fetchProjectList({
          grade: filter1.value === "ALL" ? null : filter1.value,
          projectType: filter2.value === "ALL" ? null : filter2.value,
        });
        if (projectList) {
          useProjectListStore.setState({
            projects: [...projectList],
          });
        }
      } finally {
        setLoading(false);
      }
    };

    changeFilter();
  }, [filter1.value, filter2.value]);

  // 프로젝트가 없을 시 이거
  const noProject = (
    <div className="flex flex-col text-center mt-20">
      <text className="text-gray-500">생성된 프로젝트가 없습니다.</text>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>프로젝트 목록 페이지</title>
      </Helmet>
      <div className="h-full w-full flex flex-col">
        <div className="p-6 h-full">
          {/* 상단 바 */}
          <div className="flex items-center mb-8">
            <h1 className="font-bold text-3xl text-blue-800">Projects</h1>
          </div>
          {/* 필터 영역 */}
          <div className="flex items-center gap-4 ps-2 pe-1">
            {/* 옵션1 : 기수 */}
            <Select
              name="전 기수"
              state={filter1}
              setState={setFilter1}
              onChange={(e) => {
                setFilter1(e.target.value);
              }}
              options={[
                "ALL",
                ...Array.from(
                  { length: NOW_MAX_GRADE },
                  (_, i) => NOW_MAX_GRADE - i
                ),
              ]}
            />

            {/* 옵션2 : 지역 */}
            <Select
              name="전 지역"
              state={filter2}
              setState={setFilter2}
              onChange={(e) => {
                setFilter2(e.target.value);
              }}
              options={["ALL", "관통", "공통", "특화", "자율"]}
            />
            <div className="flex items-center gap-5 ml-auto">
              <DefaultButton
                className="px-2 py-[4px] rounded-md"
                theme="bright"
                onClick={() =>
                  setIsCreateModalOpen((p) => {
                    return !p;
                  })
                }
                text={<span className="text-sm">New project</span>}
              />
            </div>
          </div>
          {loading && (
            <div className="mt-8 gap-y-2 grid px-2">
              <ProjectListItemSkeleton />
              <ProjectListItemSkeleton />
              <ProjectListItemSkeleton />
              <ProjectListItemSkeleton />
            </div>
          )}

          {/* 프로젝트가 없을 시 이거 */}
          {!loading && projects.length === 0 && noProject}

          {/* 프로젝트가 있으면 이거 */}
          {!loading && projects.length !== 0 && (
            <div className="mt-8 gap-y-2 grid px-2">
              {/* 프로젝트 목록 */}
              {projects.map((project) => (
                <ProjectListItem key={project.project_id} project={project} />
              ))}
              <Divier />
            </div>
          )}
        </div>
      </div>
      {/* createProject Modal */}
      <PortalModal
        className="!p-0"
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
        }}
      >
        <div className="w-full h-full flex flex-col">
          <CreateProject onClose={() => setIsCreateModalOpen(false)} />
        </div>
      </PortalModal>
      {/* updateUser Modal */}
      <PortalModal
        className="!p-0"
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
        }}
      >
        <div className="w-full h-full flex flex-col">
          <UpdateUser />
        </div>
      </PortalModal>
    </>
  );
}

export default ProjectListPage;
