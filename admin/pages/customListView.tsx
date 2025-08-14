import React, { useState, useEffect, useRef } from "react";
import {
  PageContainer,
  CellLink,
  CellContainer,
} from "@keystone-6/core/admin-ui/components";
import { Heading, Box, Center, Link } from "@keystone-ui/core";
import { Pill } from "@keystone-ui/pill";
import { Checkbox, TextInput } from "@keystone-ui/fields";
import { Popover } from "@keystone-ui/popover";
import { ChevronDownIcon } from "@keystone-ui/icons/icons/ChevronDownIcon";
import { Tooltip } from "@keystone-ui/tooltip";
import { z } from "zod";

const verifyVideosSchema = z.array(
  z.object({
    id: z.string(),
    sourceType: z.enum(["youtube", "embed", "upload"]),
    videoId: z.string().nullable(),
  })
);

type VideoItem = {
  id: string;
  title: string;
  author: string | null;
  sourceType: "youtube" | "embed" | "upload";
  videoId: string | null;
  thumbnail: {
    url: string;
  } | null;
  isPublic: boolean;
  isRestricted: boolean;
};

type VerificationStatus = {
  isPublic: boolean;
  isRestricted: boolean;
  message: string;
  isLoading: boolean;
};

// Mapeamento de cores (sem alterações)
const sourceTypeTones = {
  youtube: "red",
  upload: "blue",
  embed: "gray",
};

const StatusCircle = ({ video }: { video: VideoItem }) => {
  const { isPublic, isRestricted } = video;

  const problems = (!isPublic ? 1 : 0) + (isRestricted ? 1 : 0);
  let background;

  if (problems === 0) {
    background = "#22c55e";
  } else if (problems === 1) {
    background = "conic-gradient(#ef4444 0 50%, #22c55e 50% 100%)";
  } else {
    background = "#ef4444";
  }

  const circleStyle = {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: background,
    display: "inline-block",
    cursor: "pointer",
    marginTop: "5px",
  };

  const message = !isPublic
    ? "Video not public"
    : isRestricted
    ? "Video restricted"
    : "Video public";

  return (
    <Tooltip content={<span>{message}</span>}>
      {(props) => <div style={circleStyle} {...props} />}
    </Tooltip>
  );
};

export default function PaginaListaVideosCustomizada() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteHover, setIsDeleteHover] = useState(false);
  const [isVerifyHover, setIsVerifyHover] = useState(false);

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const [verificationStatus, setVerificationStatus] = useState<
    Record<string, VerificationStatus>
  >({});
  const [isVerifying, setIsVerifying] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    isPublic: false,
    isYoutube: false,
  });

  useEffect(() => {
    // A lógica de fetch continua a mesma
    const fetchData = async () => {
      const query = `
        query {
          videos(orderBy: { createdAt: desc }) {
            id
            title
            author
            sourceType
            videoId
            thumbnail {
              url
            }
            isPublic
            isRestricted
          }
        }
      `;
      try {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const jsonResponse = await res.json();
        if (jsonResponse.errors) {
          throw new Error(
            jsonResponse.errors.map((e: any) => e.message).join("\n")
          );
        }
        setVideos(jsonResponse.data.videos);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // NOVO: Funções para gerenciar a seleção
  const toggleSelection = (videoId: string) => {
    setSelectedVideos((currentSelection) => {
      if (currentSelection.includes(videoId)) {
        // Se já estiver selecionado, remove da lista
        return currentSelection.filter((id) => id !== videoId);
      } else {
        // Se não, adiciona na lista
        return [...currentSelection, videoId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedVideos.length === videos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(videos.map((v) => v.id));
    }
  };

  const allSelected =
    selectedVideos.length === videos.length && videos.length > 0;
  const someSelected = selectedVideos.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  if (loading) {
    /* ... (código de loading sem alteração) */
  }
  if (error) {
    /* ... (código de erro sem alteração) */
  }

  async function deleteVideo() {
    const userConfirmed = window.confirm(
      `Você tem certeza que deseja excluir ${selectedVideos.length} vídeo(s)? Esta ação não pode ser desfeita.`
    );

    if (!userConfirmed) {
      return;
    }
    try {
      const mutation = `
      mutation DeleteVideos($where: [VideoWhereUniqueInput!]!) {
        deleteVideos(where: $where) {
          id
        }
      }
    `;

      const variables = {
        where: selectedVideos.map((id) => ({ id: id })),
      };

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: variables,
        }),
      });

      const jsonResponse = await res.json();
      if (jsonResponse.errors) {
        throw new Error(
          jsonResponse.errors.map((e: any) => e.message).join("\n")
        );
      }

      // 5. Atualiza o estado da UI após o sucesso
      // Remove os vídeos deletados da lista na tela
      setVideos((currentVideos) =>
        currentVideos.filter((video) => !selectedVideos.includes(video.id))
      );
      // Limpa a seleção
      setSelectedVideos([]);
    } catch (err: any) {
      console.error("Erro ao excluir vídeos:", err);
      setError(`Falha ao excluir os vídeos: ${err.message}`);
    }
  }

  async function verifyVideos() {
    if (selectedVideos.length === 0) {
      alert("Selecione ao menos um vídeo para verificar.");
      return;
    }

    setIsVerifying(true);

    const videosPayload = videos
      .filter((v) => selectedVideos.includes(v.id))
      .map((v) => ({
        id: v.id,
        sourceType: v.sourceType,
        videoId: v.videoId,
      }));

    try {
      const validPayload = verifyVideosSchema.parse(videosPayload);

      // Envia para o backend
      const res = await fetch("/api/verifyVideo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: validPayload }),
      });

      const data = await res.json();
      console.log(data);

      if (data.results && typeof data.results === "object") {
        setVerificationStatus((prevStatus) => ({
          ...prevStatus,
          ...data.results,
        }));
      } else {
        console.warn("Resposta inesperada da API:", data);
      }
    } catch (err) {
      console.error("Erro ao verificar vídeos:", err);
    } finally {
      setIsVerifying(false);
    }
  }

  const gridLayout = "40px 60px 2fr 1fr 1fr 80px";

  return (
    <PageContainer header={<Heading type="h3">Videos</Heading>}>
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          paddingBottom: "var(--ks-space-large)",
          borderBottom: "1px solid var(--ks-color-border)",
          marginBottom: "var(--ks-space-large)",
          marginTop: "2rem",
        }}
      >
        {/* --- Barra de Pesquisa --- */}
        <Box
          as="form"
          onSubmit={(e) => {
            e.preventDefault();
            console.log(`Pesquisando por: ${searchTerm}`);
          }}
          style={{ flex: 1, minWidth: 320 }}
        >
          <TextInput
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>

        {/* --- Botão de Criar Vídeo --- */}
        <Link href="/videos/create">
          <button
            style={{
              whiteSpace: "nowrap",
              backgroundColor: "#2563eb",
              color: "#fff",
              fontSize: "0.875rem",
              height: "32px",
              padding: "0 12px",
              fontWeight: "500",
              borderRadius: "4px",
            }}
          >
            Create Vídeo
          </button>
        </Link>

        {/* --- Dropdown de Filtro --- */}
        <Popover
          triggerRenderer={(triggerProps) => (
            <button
              {...triggerProps}
              style={{
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                fontSize: "1rem",
                fontWeight: "500",
                height: "38px",
                padding: "0 16px",
                borderRadius: "6px",
              }}
            >
              Filtrar Lista
              <ChevronDownIcon size="small" style={{ marginLeft: "8px" }} />
            </button>
          )}
        >
          <div style={{ padding: "16px", minWidth: "240px" }}>
            <Heading type="h5" marginBottom="medium">
              Filtros
            </Heading>
            <Checkbox
              checked={filters.isPublic}
              onChange={() =>
                setFilters((f) => ({ ...f, isPublic: !f.isPublic }))
              }
            >
              Apenas públicos
            </Checkbox>
            <Checkbox
              checked={filters.isYoutube}
              onChange={() =>
                setFilters((f) => ({ ...f, isYoutube: !f.isYoutube }))
              }
            >
              Apenas do YouTube
            </Checkbox>
          </div>
        </Popover>
      </Box>

      <Box
        paddingBottom="small"
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <text
          onClick={() =>
            alert(`IDs selecionados: ${selectedVideos.join(", ")}`)
          }
        >
          {selectedVideos.length > 0 ? (
            <>
              Selected{" "}
              <strong>
                {selectedVideos.length} of {selectedVideos.length}
              </strong>
            </>
          ) : (
            <>
              Showing <strong>{videos.length} Video</strong>
            </>
          )}
        </text>
        {selectedVideos.length > 0 && (
          <>
            <button
              style={{
                color: isDeleteHover ? "#b91c1c" : "#dc2626",
                backgroundColor: isDeleteHover ? "#fee2e2" : "#fef2f2",
                borderRadius: "6px",
                border: "solid 1px transparent",
                fontSize: "1rem",
                fontWeight: "500",
                height: "38px",
                padding: "0 16px",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={() => setIsDeleteHover(true)}
              onMouseLeave={() => setIsDeleteHover(false)}
              onClick={(e) => {
                void (async () => {
                  await deleteVideo();
                })();
              }}
            >
              Delete
            </button>
            <button
              style={{
                backgroundColor: isVerifyHover ? "#d5e7fdff" : "#eff6ff",
                color: isVerifyHover ? "#1e50bbff" : "#2563eb",
                borderRadius: "6px",
                border: "solid 1px transparent",
                fontSize: "1rem",
                fontWeight: "500",
                height: "38px",
                padding: "0 16px",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={() => setIsVerifyHover(true)}
              onMouseLeave={() => setIsVerifyHover(false)}
              disabled={isVerifying}
              onClick={(e) => {
                void (async () => {
                  await verifyVideos();
                })();
              }}
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </button>
          </>
        )}
      </Box>
      <Box
        style={{
          borderBottom: "1px solid var(--ks-color-border)",
          display: "grid",
          gridTemplateColumns: gridLayout,
          gap: "var(--ks-space-medium)",
          borderBottomWidth: "2px",
          borderColor: "#e1e5e9",
          borderStyle: "solid",
          fontWeight: "500",
          textAlign: "left",
          color: "#6b7280",
          whiteSpace: "nowrap",

          alignItems: "center",
        }}
      >
        {/* O Box abaixo é o wrapper que corrige o erro de tipo */}
        <Checkbox
          checked={allSelected}
          style={{
            // Propriedade para o estado indeterminado
            appearance: someSelected ? "auto" : undefined,
            content: '""',
            display: "block",
            width: "0px",
            marginRight: "8px",
            backgroundColor: "var(--ks-color-foreground)",
          }}
          onChange={toggleSelectAll}
          children={undefined}
        ></Checkbox>

        <CellContainer>Thumb</CellContainer>
        <CellContainer>Title</CellContainer>
        <CellContainer>Author/Channel</CellContainer>
        <CellContainer>Origin</CellContainer>
        <CellContainer>Status</CellContainer>
      </Box>

      {/* Corpo da Lista ATUALIZADO */}
      {videos.map((video) => (
        <Box
          key={video.id}
          style={{
            borderBottom: "1px solid var(--ks-color-border)",
            // whiteSpace: "nowrap",
            display: "grid",
            gridTemplateColumns: gridLayout,
            gap: "var(--ks-space-medium)",
            alignItems: "center",
            backgroundColor: selectedVideos.includes(video.id)
              ? "var(--ks-color-background-selected)" // Cor de fundo para item selecionado
              : "transparent",
          }}
        >
          {/* NOVO: Coluna do Checkbox individual */}
          <CellContainer>
            <Checkbox
              checked={selectedVideos.includes(video.id)}
              onChange={() => toggleSelection(video.id)}
              children={undefined}
            ></Checkbox>
          </CellContainer>

          {/* Colunas restantes sem alteração na lógica */}
          <CellContainer>
            {video.thumbnail?.url ? (
              <img
                src={video.thumbnail.url}
                alt={`Thumbnail for ${video.title}`}
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "cover",
                  borderRadius: "var(--ks-border-radius-small)",
                }}
              />
            ) : null}
          </CellContainer>
          <CellLink href={`/videos/${video.id}`}>{video.title}</CellLink>
          <CellContainer>{video.author || "N/A"}</CellContainer>
          <CellContainer>
            <Pill
              color={sourceTypeTones[video.sourceType] || "gray"}
              weight="light"
            >
              {video.sourceType}
            </Pill>
          </CellContainer>
          <CellContainer>
            <StatusCircle video={video} />
          </CellContainer>
        </Box>
      ))}
    </PageContainer>
  );
}
