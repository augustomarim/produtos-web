"use client";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import ProdutoForm from "../../../../src/components/ProdutoForm";
import { Shell, Spinner } from "../../../../src/components/ui";
export default function EditarProdutoPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="empty-state" role="status">
            <Spinner />
            <p>Preparando formulário…</p>
          </div>
        </Shell>
      }
    >
      <Editor />
    </Suspense>
  );
}
function Editor() {
  const { id } = useParams<{ id: string }>();
  return <ProdutoForm key={id} id={id} />;
}
