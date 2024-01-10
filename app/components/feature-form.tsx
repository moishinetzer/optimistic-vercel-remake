import { Form } from "@remix-run/react";
import clsx from "clsx";
import { useState } from "react";

export function NewFeatureForm() {
  const [title, setTitle] = useState("");
  const id = Math.random().toString(36).slice(2);

  return (
    <div className="mx-8 w-full">
      <Form
        navigate={false}
        method="POST"
        action="/?index"
        className="relative my-8"
        onSubmit={() => setTitle("")}
      >
        <input
          aria-label="Suggest a feature for our roadmap"
          className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
          maxLength={150}
          placeholder="I want..."
          required
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input type="hidden" name="intent" value="feature" />
        <input type="hidden" name="id" value={id} />
        <button
          className={clsx(
            "flex items-center justify-center absolute right-2 top-2 px-4 h-10 text-lg border bg-black text-white rounded-md w-24 focus:outline-none focus:ring focus:ring-blue-300 focus:bg-gray-800"
          )}
          type="submit"
        >
          Request
        </button>
      </Form>
    </div>
  );
}

export type Feature = {
  id: string;
  title: string;
  score: number;
  created_at: string;
};

export function FeatureList({ features }: { features: Feature[] }) {
  const sortedFeatures = features.sort((a, b) => {
    // First, compare by score in descending order
    if (a.score > b.score) return -1;
    if (a.score < b.score) return 1;

    // If scores are equal, then sort by created_at i n ascending order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <>
      <div className="w-full">
        {sortedFeatures.map((feature, index) => (
          <Item
            key={feature.id}
            isFirst={index === 0}
            isLast={index === sortedFeatures.length - 1}
            feature={feature}
          />
        ))}
      </div>
    </>
  );
}

export function Item({
  isFirst,
  isLast,
  feature,
}: {
  isFirst: boolean;
  isLast: boolean;
  feature: Feature;
}) {
  return (
    <Form
      navigate={false}
      method="POST"
      action="/?index"
      className={clsx(
        "p-6 mx-8 flex items-center border-t border-l border-r",
        isFirst && "rounded-t-md",
        isLast && "border-b rounded-b-md"
      )}
    >
      <button
        className={clsx(
          "ring-1 ring-gray-200 rounded-full w-8 min-w-[2rem] h-8 mr-4 focus:outline-none focus:ring focus:ring-blue-300"
        )}
        type="submit"
        name="intent"
        value="upvote"
      >
        👍
      </button>
      <input type="hidden" name="id" value={feature.id} />
      <h3 className="text font-semibold w-full text-left">{feature.title}</h3>

      <button
        className="bg-gray-200 text-gray-700 text-sm rounded-xl px-2 ml-2"
        type="submit"
        name="intent"
        value="delete"
      >
        {feature.score}
      </button>
    </Form>
  );
}
