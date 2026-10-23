import { JudgeDemo } from "@/components/judge-demo";
import { Product } from "@/components/product";
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if ((slug ?? []).join("/") === "demo/present") return <JudgeDemo />;
  return <Product path={"/" + (slug ?? []).join("/")} />;
}
