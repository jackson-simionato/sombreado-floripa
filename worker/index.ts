import handler from "vinext/server/app-router-entry";

const worker = {
  fetch(request: Request) {
    return handler.fetch(request);
  },
};

export default worker;

addEventListener("fetch", (event) => {
  const fetchEvent = event as Event & {
    request: Request;
    respondWith(response: Promise<Response>): void;
  };

  fetchEvent.respondWith(worker.fetch(fetchEvent.request));
});
