// Redirect to login page
import { Redirect } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    let cancelled = false;
    import("expo-notifications")
      .then((Notifications) => {
        if (cancelled) return;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <Redirect href="/login" />;
}
