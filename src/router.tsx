import { createBrowserRouter } from "react-router";
import AppLayout from "@/components/layout/app-layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import RBACPage from "@/pages/rbac";
import NotificationsPage from "@/pages/notifications";
import FeaturesPage from "@/pages/features";
import ContributionsPage from "@/pages/contributions";
import ReviewsPage from "@/pages/reviews";
import MaterialsPage from "@/pages/materials";
import HeroesPage from "@/pages/heroes";
import ConfigPage from "@/pages/config";
import PointsPage from "@/pages/points";
import CourseTablesPage from "@/pages/course-tables";
import QuestionsPage from "@/pages/questions";
import FailRatesPage from "@/pages/failrates";
import OrganizationsPage from "@/pages/organizations";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "rbac", element: <RBACPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "features", element: <FeaturesPage /> },
      { path: "contributions", element: <ContributionsPage /> },
      { path: "reviews", element: <ReviewsPage /> },
      { path: "materials", element: <MaterialsPage /> },
      { path: "heroes", element: <HeroesPage /> },
      { path: "config", element: <ConfigPage /> },
      { path: "points", element: <PointsPage /> },
      { path: "course-tables", element: <CourseTablesPage /> },
      { path: "questions", element: <QuestionsPage /> },
      { path: "failrates", element: <FailRatesPage /> },
      { path: "organizations", element: <OrganizationsPage /> },
    ],
  },
]);
