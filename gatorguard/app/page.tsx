"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import ClientComponent from "./components/ClientComponent";

const links = [
  { name: "Google", url: "https://www.google.com" },
  { name: "GitHub", url: "https://github.com" },
  { name: "Stack Overflow", url: "https://stackoverflow.com" },
  { name: "ChatGPT", url: "https://chatgpt.com" },
];

export default function Home() {
  return (
    <div className="flex justify-center w-full">
      <main className="flex flex-col items-center justify-start w-[400px] min-h-[500px] p-6">
        <h1 className="mb-8 text-4xl font-bold">External Links</h1>
        <div className="grid grid-cols-2 gap-4 w-full mb-6">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full">{link.name}</Button>
            </Link>
          ))}
        </div>
        <div className="mt-6 w-full">
          <ClientComponent />
        </div>
      </main>
    </div>
  );
}
