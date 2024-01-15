import { ActionFunctionArgs, json } from "@remix-run/node";
import { useFetchers, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { FeatureList, NewFeatureForm } from "~/components/feature-form";

function VercelLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label="Vercel Logo"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 19"
      {...props}
    >
      <path
        clipRule="evenodd"
        d="M12.04 2L2.082 18H22L12.04 2z"
        fill="#000"
        fillRule="evenodd"
        stroke="#000"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "feature" || intent === "upvote") {
    const id = String(formData.get("id")!);

    if (!id) {
      throw new Error("Missing id or upvoteId");
    }

    const title = String(formData.get("title"));

    await db.feature.upsert({
      where: {
        id,
      },
      create: {
        id,
        title,
      },
      update: {},
    });

    if (intent === "upvote") {
      const upvoteId = String(formData.get("upvoteId"!));

      if (!upvoteId) {
        throw new Error("Missing upvoteId");
      }

      await db.upvote.create({
        data: {
          featureId: id,
          id: upvoteId,
        },
      });
    }
  } else if (intent === "delete") {
    const id = String(formData.get("id"));

    if (!id) {
      throw new Error("Missing id");
    }

    await db.feature.delete({
      where: {
        id,
      },
    });
  }

  return null;
}

export async function loader() {
  const features = await db.feature.findMany({
    include: {
      upvotes: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return json({
    features: features ?? [],
  });
}

export default function Page() {
  const { features } = useLoaderData<typeof loader>();

  const upvotesMap = new Map(
    features.map((feature) => [
      feature.id,
      new Set(feature.upvotes.map((upvote) => upvote.id)),
    ])
  );

  const fetchers = useFetchers();

  fetchers
    .filter((fetcher) => fetcher!.formData!.get("intent") === "upvote")
    .forEach((fetcher) => {
      const featureId = String(fetcher!.formData!.get("id"));
      const upvoteId = String(fetcher!.formData!.get("upvoteId"));
      const upvotes = upvotesMap.get(featureId) || new Set();
      upvotes.add(upvoteId);
      upvotesMap.set(featureId, upvotes);
    });

  const pendingNewFeatures = fetchers
    .filter((fetcher) => fetcher!.formData!.get("intent") === "feature")
    .map((fetcher) => ({
      id: String(fetcher!.formData!.get("id")),
      title: String(fetcher!.formData!.get("title")),
      created_at: new Date().toISOString(),
      upvotes: [],
    }));

  const pendingDeletions = fetchers
    .filter((fetcher) => fetcher!.formData!.get("intent") === "delete")
    .map((fetcher) => String(fetcher!.formData!.get("id")));

  const featuresMap = new Map(
    features
      // Add new features
      .concat(pendingNewFeatures)
      .filter((feature) => !pendingDeletions.includes(feature.id))
      .map((feature) => [
        feature.id,
        { ...feature, upvotes: upvotesMap.get(feature.id)?.size ?? 0 },
      ])
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-20 text-center">
        <div className="flex justify-center items-center bg-black rounded-full w-16 sm:w-24 h-16 sm:h-24 my-8">
          <VercelLogo className="h-8 sm:h-16 invert p-3 mb-1" />
        </div>
        <h1 className="text-lg sm:text-2xl font-bold mb-2">
          Help us prioritize our roadmap
        </h1>
        <h2 className="text-md sm:text-xl mx-4">
          Create or vote up features you want to see in our product.
        </h2>
        <div className="flex flex-wrap items-center justify-around max-w-4xl my-8 sm:w-full bg-white rounded-md shadow-xl h-full border border-gray-100">
          <NewFeatureForm />
          <FeatureList features={Array.from(featuresMap.values())} />

          <hr className="border-1 border-gray-200 my-8 mx-8 w-full" />
          <div className="mx-8 w-full">
            <p className="flex text-gray-500">
              Leave your email address here to be notified when feature requests
              are released.
            </p>
            <form className="relative my-4">
              <input
                name="email"
                aria-label="Email for updates"
                placeholder="Email Address"
                type="email"
                autoComplete="email"
                maxLength={60}
                required
                className="px-3 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
              />
              <button
                className="flex items-center justify-center absolute right-2 top-2 px-4 h-10 border border-gray-200 text-gray-900 rounded-md w-14 focus:outline-none focus:ring focus:ring-blue-300 focus:bg-gray-100"
                type="submit"
              >
                OK
              </button>
            </form>
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="flex items-center my-8 w-full justify-center sm:justify-start">
                Powered by
                <VercelLogo className="h-5 mx-2" />
              </p>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="flex rounded focus:outline-none focus:ring focus:ring-blue-300 mb-4 sm:mb-0 min-w-max"
                href={`https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-redis&project-name=redis-roadmap&repository-name=redis-roadmap&demo-title=Redis%20Roadmap&demo-description=Create%20and%20upvote%20features%20for%20your%20product.&demo-url=https%3A%2F%2Froadmap-redis.vercel.app%2F&stores=%5B%7B"type"%3A"kv"%7D%5D&`}
              >
                <img
                  src="https://vercel.com/button"
                  alt="Vercel Deploy Button"
                />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
