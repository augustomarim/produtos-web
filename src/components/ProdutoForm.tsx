"use client";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { GuardedLink as Link, useFeedback } from "./Feedback";
import { PhotoViewer, SlowFeedback, useUnsavedChanges } from "./Experience";
import { useRouter } from "next/navigation";
import type { Produto } from "../types/produto";
import { ApiError, apiAutenticada } from "../lib/api";
import { renovarSessao, SessaoExpiradaError } from "../lib/sessao";
import { formatarData } from "../lib/produtos";
import { Icon, Shell, Spinner } from "./ui";

export default function ProdutoForm({ id }: { id?: string }) {
  const router = useRouter();
  const { notify, confirm, dismiss } = useFeedback();
  const codigoRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [navegando, iniciarNavegacao] = useTransition();
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");
  const [produto, setProduto] = useState<Produto | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fotoInvalida, setFotoInvalida] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [pronto, setPronto] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [operacao, setOperacao] = useState<"salvar" | "foto" | null>(null);
  const [erro, setErro] = useState("");

  const previewUrl = useRef("");
  const ocupado = operacao !== null || navegando;
  const alterado =
    pronto &&
    (codigo !== (produto?.codigo_produto || "") ||
      descricao !== (produto?.descricao_produto || "") ||
      status !== (produto?.status || "ativo") ||
      foto !== null ||
      fotoInvalida);
  const descartar = useCallback(() => {
    setCodigo(produto?.codigo_produto || "");
    setDescricao(produto?.descricao_produto || "");
    setStatus(produto?.status || "ativo");
    setFoto(null);
    setFotoInvalida(false);
    setPreview("");
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = "";
    setCampos({});
    setErro("");
  }, [produto]);
  useUnsavedChanges(alterado, ocupado, descartar);
  function limparCampo(nome: string) {
    setCampos((c) => {
      const novo = { ...c };
      delete novo[nome];
      return novo;
    });
  }
  function focarCampo(nome: string) {
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>(`[name="${nome}"]`)?.focus(),
    );
  }

  useEffect(() => {
    let ativo = true;
    const controller = new AbortController();
    async function carregar() {
      try {
        if (id) {
          const p = await apiAutenticada<Produto>(`/api/produtos/${id}`, {
            signal: controller.signal,
          });
          if (!ativo) return;
          setProduto(p);
          setCodigo(p.codigo_produto);
          setDescricao(p.descricao_produto);
          setStatus(p.status);
        } else await renovarSessao();
        if (ativo) setPronto(true);
      } catch (error) {
        if (!ativo) return;
        if (error instanceof SessaoExpiradaError) {
          router.replace("/login");
          return;
        }
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível abrir o formulário.",
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
      controller.abort();
    };
  }, [id, router, tentativa]);
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  function selecionarFoto(arquivo: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = "";
    setFoto(null);
    setPreview("");
    setFotoInvalida(false);
    limparCampo("foto_produto");
    setErro("");
    dismiss();
    if (!arquivo) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) ||
      arquivo.size > 4 * 1024 * 1024
    ) {
      setFotoInvalida(true);
      setCampos((c) => ({
        ...c,
        foto_produto: "Selecione uma foto JPG, PNG ou WebP de até 4 MB.",
      }));
      setErro("Selecione uma foto JPG, PNG ou WebP de até 4 MB.");
      return;
    }
    previewUrl.current = URL.createObjectURL(arquivo);
    setFoto(arquivo);
    setPreview(previewUrl.current);
  }
  function falha(error: unknown) {
    if (error instanceof SessaoExpiradaError) {
      router.replace("/login");
      return;
    }
    if (error instanceof ApiError) {
      const camposApi: Record<string, string> = {};
      for (const detalhe of error.details) {
        const campo = {
          codigo_produto: "codigo",
          descricao_produto: "descricao",
          status: "status",
          foto_produto: "foto_produto",
        }[detalhe.field];
        if (campo) camposApi[campo] = detalhe.message;
      }
      if (error.status === 409)
        camposApi.codigo = "Este código já está sendo usado. Escolha outro.";
      if (error.status === 413)
        camposApi.foto_produto =
          "A imagem excede o tamanho permitido. Escolha uma foto de até 4 MB.";
      if (Object.keys(camposApi).length) {
        setCampos(camposApi);
        setErro("Revise os campos destacados.");
        focarCampo(Object.keys(camposApi)[0]);
        return;
      }
    }
    setErro(
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação.",
    );
  }
  function limparCadastro() {
    setCodigo("");
    setDescricao("");
    setStatus("ativo");
    setProduto(null);
    selecionarFoto(null);
    setCampos({});
  }
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ocupado) return;
    if (fotoInvalida) {
      setErro("Escolha uma foto válida ou remova a seleção inválida.");
      return;
    }
    const invalidos: Record<string, string> = {};
    if (!codigo.trim()) invalidos.codigo = "Informe o código do produto.";
    if (!descricao.trim())
      invalidos.descricao = "Informe a descrição do produto.";
    setCampos(invalidos);
    if (Object.keys(invalidos).length) {
      setErro("Revise os campos destacados.");
      focarCampo(Object.keys(invalidos)[0]);
      return;
    }
    const cadastrarOutro =
      !id &&
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
        "outro";
    setOperacao("salvar");
    setErro("");
    dismiss();
    try {
      const form = new FormData();
      form.set("codigo_produto", codigo.trim());
      form.set("descricao_produto", descricao.trim());
      if (id) form.set("status", status);
      if (foto) form.set("foto_produto", foto);
      const salvo = await apiAutenticada<Produto>(
        id ? `/api/produtos/${id}` : "/api/produtos",
        { method: id ? "PUT" : "POST", body: form },
      );
      // Next.js preserves this page when navigating. Leave a fresh, unlocked
      // form for the next visit, while the transition keeps this one disabled.
      if (!id) limparCadastro();
      else {
        setProduto(salvo);
        selecionarFoto(null);
      }
      setOperacao(null);
      notify(
        id ? "Produto atualizado com sucesso." : "Produto criado com sucesso.",
      );
      if (cadastrarOutro)
        requestAnimationFrame(() => codigoRef.current?.focus());
      else iniciarNavegacao(() => router.replace("/produtos"));
    } catch (error) {
      falha(error);
      setOperacao(null);
    }
  }
  async function removerFoto() {
    if (!id || ocupado || !produto?.foto_produto) return;
    if (
      !(await confirm({
        title: "Remover foto atual?",
        description:
          "A remoção é imediata e não pode ser desfeita. As demais alterações do formulário serão mantidas.",
        confirmLabel: "Remover foto",
        danger: true,
      }))
    )
      return;
    setOperacao("foto");
    setErro("");
    dismiss();
    try {
      const p = await apiAutenticada<Produto>(`/api/produtos/${id}/foto`, {
        method: "DELETE",
      });
      setProduto(p);
      selecionarFoto(null);
      notify(
        "Foto removida. As outras alterações só serão salvas ao confirmar o formulário.",
      );
    } catch (error) {
      falha(error);
    } finally {
      setOperacao(null);
    }
  }
  const imagem = preview || produto?.foto_produto;
  return (
    <Shell>
      <div className="form-width">
        <Link
          className="back-link"
          href="/produtos"
          aria-disabled={ocupado}
          onClick={(e) => {
            if (ocupado) e.preventDefault();
          }}
        >
          <Icon name="arrow" />
          Voltar ao catálogo
        </Link>
        <div className="page-heading">
          <div>
            <span className="eyebrow">SEU CATÁLOGO</span>
            <h1>{id ? "Editar produto" : "Novo produto"}</h1>
            <p className="muted">
              {id
                ? "Atualize as informações e mantenha seu catálogo em dia."
                : "Preencha os detalhes para adicionar um produto ao catálogo."}
            </p>
          </div>
        </div>
        <section className="form-panel">
          {carregando ? (
            <div className="empty-state" role="status">
              <Spinner />
              <SlowFeedback
                active={carregando}
                message="Preparando formulário…"
              />
            </div>
          ) : !pronto ? (
            <div className="empty-state">
              <p role="alert" className="notice notice-error">
                {erro}
              </p>
              <button
                className="button button-primary"
                onClick={() => {
                  setCarregando(true);
                  setErro("");
                  setTentativa((n) => n + 1);
                }}
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <form ref={formRef} noValidate onSubmit={salvar}>
              <h2>Informações do produto</h2>
              <p className="form-hint" style={{ marginBottom: 23 }}>
                Os campos com * são obrigatórios.
              </p>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código *</span>
                  <input
                    className="form-input"
                    ref={codigoRef}
                    name="codigo"
                    aria-label="Código *"
                    aria-invalid={!!campos.codigo}
                    aria-describedby={campos.codigo ? "erro-codigo" : undefined}
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value);
                      limparCampo("codigo");
                    }}
                    required
                    disabled={ocupado}
                    placeholder="Ex.: AG-001"
                  />
                  {campos.codigo && (
                    <span id="erro-codigo" className="field-error">
                      {campos.codigo}
                    </span>
                  )}
                </label>
                {id ? (
                  <label className="form-field">
                    <span>Status</span>
                    <select
                      className="form-input"
                      name="status"
                      aria-label="Status"
                      aria-invalid={!!campos.status}
                      aria-describedby={
                        campos.status ? "erro-status" : undefined
                      }
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as "ativo" | "inativo")
                      }
                      disabled={ocupado}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                    {campos.status && (
                      <span id="erro-status" className="field-error">
                        {campos.status}
                      </span>
                    )}
                  </label>
                ) : (
                  <div className="form-field">
                    <span>Status inicial</span>
                    <span className="status-badge ativo">
                      <span />
                      Ativo
                    </span>
                    <p className="form-hint">
                      Você pode alterar depois, a qualquer momento.
                    </p>
                  </div>
                )}
              </div>
              <label className="form-field">
                <span>Descrição *</span>
                <textarea
                  className="form-input"
                  name="descricao"
                  aria-label="Descrição *"
                  aria-invalid={!!campos.descricao}
                  aria-describedby={
                    campos.descricao ? "erro-descricao" : undefined
                  }
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value);
                    limparCampo("descricao");
                  }}
                  required
                  disabled={ocupado}
                  rows={3}
                  placeholder="Como este produto deve aparecer no catálogo?"
                />
                {campos.descricao && (
                  <span id="erro-descricao" className="field-error">
                    {campos.descricao}
                  </span>
                )}
              </label>
              <div className="photo-section">
                <h2>Foto do produto</h2>
                <p className="form-hint">
                  Opcional · JPG, PNG ou WebP · até 4 MB
                </p>
                <div className="photo-editor">
                  {imagem ? (
                    <PhotoViewer
                      className="photo-preview"
                      src={imagem}
                      name={
                        foto
                          ? "Pré-visualização da nova foto"
                          : "Foto atual do produto"
                      }
                    />
                  ) : (
                    <span
                      className="photo-preview photo-placeholder"
                      role="img"
                      aria-label="Produto sem foto"
                    >
                      <Icon name="image" size={36} />
                    </span>
                  )}
                  <div className="photo-options">
                    <label
                      className="button button-secondary upload-label"
                      aria-disabled={ocupado}
                    >
                      <Icon name="image" />
                      {imagem ? "Escolher outra foto" : "Escolher foto"}
                      <input
                        name="foto_produto"
                        aria-invalid={!!campos.foto_produto}
                        aria-describedby={
                          campos.foto_produto ? "erro-foto" : undefined
                        }
                        aria-label="Foto do produto"
                        className="file-overlay"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={ocupado}
                        onChange={(e) => {
                          selecionarFoto(e.target.files?.[0] || null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {(foto || fotoInvalida) && (
                      <button
                        type="button"
                        className="text-button"
                        style={{ marginLeft: 0 }}
                        disabled={ocupado}
                        onClick={() => selecionarFoto(null)}
                      >
                        {fotoInvalida
                          ? "Remover seleção inválida"
                          : "Descartar nova foto"}
                      </button>
                    )}
                    {id && produto?.foto_produto && !foto && (
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => void removerFoto()}
                        disabled={ocupado}
                      >
                        {operacao === "foto" ? (
                          <Spinner />
                        ) : (
                          <Icon name="trash" />
                        )}
                        {operacao === "foto"
                          ? "Removendo…"
                          : "Remover foto atual"}
                      </button>
                    )}
                    <p className="form-hint">
                      {foto
                        ? foto.name
                        : "Uma boa foto ajuda a identificar o produto."}
                    </p>
                  </div>
                </div>
                {campos.foto_produto && (
                  <p id="erro-foto" className="field-error">
                    {campos.foto_produto}
                  </p>
                )}
                {id && produto?.foto_produto && (
                  <p className="form-hint">
                    A remoção da foto é imediata. Uma nova foto só é enviada ao
                    salvar.
                  </p>
                )}
              </div>
              {produto && (
                <div className="product-dates" style={{ marginTop: 20 }}>
                  <span>
                    Criado{" "}
                    <time dateTime={produto.createdAt || undefined}>
                      {formatarData(produto.createdAt)}
                    </time>
                  </span>
                  <span>
                    Última alteração{" "}
                    <time dateTime={produto.updatedAt || undefined}>
                      {formatarData(produto.updatedAt)}
                    </time>
                  </span>
                </div>
              )}
              {erro && (
                <p role="alert" className="notice notice-error form-notice">
                  {erro}
                </p>
              )}
              <SlowFeedback
                active={ocupado}
                message={
                  operacao === "foto" ? "Removendo foto…" : "Salvando produto…"
                }
              />
              <div className="form-footer">
                <Link
                  href="/produtos"
                  className="button button-secondary"
                  aria-disabled={ocupado}
                  onClick={(e) => {
                    if (ocupado) e.preventDefault();
                  }}
                >
                  Cancelar
                </Link>
                <button
                  className="button button-primary"
                  disabled={ocupado}
                  type="submit"
                >
                  {operacao === "salvar" || navegando ? (
                    <Spinner />
                  ) : (
                    <Icon name="check" />
                  )}
                  {operacao === "salvar" || navegando
                    ? "Salvando…"
                    : id
                      ? "Salvar alterações"
                      : "Criar produto"}
                </button>
                {!id && (
                  <button
                    className="button button-secondary"
                    type="submit"
                    name="destino"
                    value="outro"
                    disabled={ocupado}
                  >
                    Salvar e cadastrar outro
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </Shell>
  );
}
