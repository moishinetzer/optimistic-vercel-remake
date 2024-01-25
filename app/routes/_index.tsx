import { ActionFunctionArgs, json } from "@remix-run/node";
import { useFetchers, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { FeatureList, NewFeatureForm } from "~/components/feature-form";

function RemixLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 256 297" {...props}>
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <path
          d="M141.674538,-7.10542736e-15 C218.04743,-7.10542736e-15 256,36.3493031 256,94.4136694 C256,137.843796 229.292875,166.16709 193.214546,170.888177 C223.670152,177.025429 241.473826,194.491998 244.754554,228.952544 L245.229325,235.289856 L245.643706,241.214203 L246.00181,246.756109 L246.250531,250.934795 L246.517683,255.865245 L246.656217,258.679019 L246.853693,263.148984 L247.012965,267.370833 L247.091895,269.797544 L247.198581,273.685906 L247.290626,278.131883 L247.324005,280.280236 L247.384197,286.505871 L247.403543,293.002292 L247.40462,296.886512 L168.646185,296.886512 L168.650135,295.266478 L168.650135,295.266478 L168.678181,292.120279 L168.678181,292.120279 L168.725186,289.055223 L168.861417,281.631321 L168.895871,279.142491 L168.922852,275.239899 L168.922852,275.239899 L168.919162,272.744266 L168.896218,270.127045 L168.864335,268.072886 L168.799537,265.197081 L168.706158,262.147348 L168.580806,258.904651 L168.42009,255.449957 L168.325411,253.637163 L168.164297,250.804473 L167.978998,247.828446 L167.691838,243.623566 L167.444542,240.281862 C167.373519,239.25114 167.291291,238.24473 167.19786,237.262104 L166.996058,235.328408 C164.395177,212.50087 155.340815,203.170989 139.832974,200.059114 L138.525715,199.814028 C137.64425,199.660026 136.742867,199.52459 135.821566,199.406474 L134.424675,199.242133 C134.189371,199.216855 133.952821,199.192621 133.715026,199.169411 L132.27332,199.042283 L132.27332,199.042283 L130.801736,198.938792 L130.801736,198.938792 L129.300276,198.858003 L129.300276,198.858003 L127.785563,198.799503 L126.241612,198.761396 L124.668422,198.742777 L124.668422,198.742777 L0,198.740492 L0,136.900224 L127.619345,136.900224 C129.706029,136.900224 131.728173,136.860653 133.685777,136.779928 L135.621869,136.685425 L135.621869,136.685425 L137.514935,136.563134 L137.514935,136.563134 L139.364974,136.412701 C139.669729,136.385264 139.97269,136.35664 140.273859,136.326822 L142.05936,136.133518 C143.235352,135.995014 144.382659,135.837162 145.501284,135.659493 L147.157707,135.378069 C167.866574,131.62361 178.22062,120.630459 178.22062,99.1783057 C178.22062,75.1035054 161.354066,60.5128152 127.619345,60.5128152 L0,60.5128152 L0,-7.10542736e-15 L141.674538,-7.10542736e-15 Z M83.2762921,250.785352 C93.6094556,250.785352 97.9327877,256.522818 99.4729615,262.01452 L99.6761617,262.804225 L99.6761617,262.804225 L99.8429155,263.58653 L99.9515227,264.204367 L99.9979397,264.509915 L100.075689,265.112992 L100.134243,265.703672 L100.156667,265.993728 L100.188494,266.561991 L100.198173,266.839685 L100.205751,267.380932 L100.205751,296.886512 L0,296.886512 L0,250.785352 L83.2762921,250.785352 Z"
          fill="#121212"
          fillRule="nonzero"
        />
      </g>
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
          <RemixLogo className="h-8 sm:h-16 invert p-3 mb-1" />
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
                <RemixLogo className="h-5 mx-2" />
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
