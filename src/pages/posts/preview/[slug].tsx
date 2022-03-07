import { GetStaticPaths, GetStaticProps } from "next";
import { getSession, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { RichText } from "prismic-dom";
import { useEffect } from "react";
import { getPrismicClient } from "../../../services/prismic";

import styles from "../post.module.scss";

interface PostPreviewProps {
  post: {
    slug: string;
    title: string;
    content: string;
    updatedAt: string;
  };
}

export default function PostPreview({ post }: PostPreviewProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirecionamento do usuário, caso ele faça o login visualizando um preview
  useEffect(() => {
    if (session?.activeSubscription) {
      router.push(`/posts/${post.slug}`);
    }
  }, [session]);

  return (
    <>
      <Head>
        <title>{post.title} | Ignews</title>
      </Head>
      <main className={styles.container}>
        <article className={styles.post}>
          <h1>{post.title}</h1>
          <time>{post.updatedAt}</time>
          <div
            className={`${styles.postContent} ${styles.previewContent}`}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          <div className={styles.continueReading}>
            Wanna continue reading?
            <Link href="/">
              <a>Subscribe now 🤗</a>
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}

// CONFIGURAÇÃO DA GERAÇÃO DO CONTEÚDO ESTÁTICO
// "Paths" define quais previews de posts (pelo slug) devem ou não ter suas páginas
// estáticas geradas durante a build da aplicaçãp. Se esse campo for deixado em
// branco, as páginas estáticas são geradas no primeiro acesso.
// "Fallback" pode receber 3 valores (true, false ou blocking).
//   - true: faz a requisição dos dados pelo browser, podendo construir o html sem conteúdo
//   - false: se a página não tiver sido gerada estaticamente, retorna erro 404
//   - blocking: se a página não tiver sido gerada estaticamente, controi o html e requisita o
//               conteúdo no servidor Next.js e só após isso mostra a página
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

// CARREGAMENTO DO CONTEÚDO DO POSTPREVIEW:
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  // Recuperação do conteúdo do post pelo Prismic CMS
  const prismic = getPrismicClient();
  const response = await prismic.getByUID<any>("post", String(slug), {});

  // Formatação dos dados
  const post = {
    slug,
    title: RichText.asText(response.data.title),
    content: RichText.asHtml(response.data.content.splice(0, 3)),
    updatedAt: new Date(response.last_publication_date).toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    ),
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
