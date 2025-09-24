"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../../context/SidebarContext";
import { useAuth } from "../../context/AuthContext";
import {
  ChevronDownIcon,
  GridIcon,
  UserCircleIcon,
  DollarIcon,
  CarIcon,
  ToolIcon,
  ReportIcon,
  CheckLineIcon,
  StockIcon,
  HorizontaLDots,
} from "../../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  roles: string[];
};

// Super Admin Navigation Items
const superAdminItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
    roles: ["super_admin"]
  },
  {
    icon: <CheckLineIcon />,
    name: "Check-ins",
    subItems: [
      { name: "New Check-in", path: "/checkins/new", pro: false },
      { name: "Check-in History", path: "/checkins/history", pro: false }
    ],
    roles: ["super_admin"]
  },
  {
    icon: <UserCircleIcon />,
    name: "User Management",
    subItems: [
      { name: "Manage Admins", path: "/users/admins", pro: false },
      { name: "Manage Washers", path: "/users/washers", pro: false },
      { name: "Manage Locations", path: "/users/locations", pro: false }

    ],
    roles: ["super_admin"]
  },
  {
    icon: <DollarIcon />,
    name: "Financial",
    subItems: [
      { name: "Payment History", path: "/financial/payments", pro: false },
      { name: "Financial Reports", path: "/financial/reports", pro: false },
      { name: "Bonuses", path: "/financial/bonuses", pro: false },
    ],
    roles: ["super_admin"]
  },
  {
    icon: <CarIcon />,
    name: "Operations",
    subItems: [
      { name: "Customer Database", path: "/operations/customers", pro: false },
      { name: "Services", path: "/operations/services", pro: false },
      { name: "Check-ins", path: "/operations/checkins", pro: false },
      { name: "Milestones", path: "/milestones", pro: false }
    ],
    roles: ["super_admin"]
  },
  {
    icon: <StockIcon />,
    name: "Stock Management",
    subItems: [
      { name: "Inventory", path: "/stock/inventory", pro: false },
      { name: "Update Stock", path: "/stock/update", pro: false }
    ],
    roles: ["super_admin"]
  },
  {
    icon: <ToolIcon />,
    name: "Tools & Equipment",
    subItems: [
      { name: "Tool Management", path: "/tools/management", pro: false },
      { name: "Tool Assignments", path: "/tools/assignments", pro: false },
      { name: "Lost Tool Charges", path: "/tools/charges", pro: false }
    ],
    roles: ["super_admin"]
  },
  {
    icon: <ReportIcon />,
    name: "Reports & Analytics",
    subItems: [
      // { name: "Performance Reports", path: "/reports/performance", pro: false },
      // { name: "Sales Reports", path: "/reports/sales", pro: false },
      { name: "Stock Reports", path: "/reports/stock", pro: false }
    ],
    roles: ["super_admin"]
  },
  {
    icon: <UserCircleIcon />,
    name: "Profile",
    subItems: [
      { name: "Change Password", path: "/change-password", pro: false }
    ],
    roles: ["super_admin"]
  }
];

// Admin Navigation Items
const adminItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
    roles: ["admin"]
  },
  {
    icon: <CheckLineIcon />,
    name: "Check-ins",
    subItems: [
      { name: "New Check-in", path: "/checkins/new", pro: false },
      { name: "Check-in History", path: "/checkins/history", pro: false }
    ],
    roles: ["admin"]
  },
  {
    icon: <CarIcon />,
    name: "Operations",
    subItems: [
      { name: "Customer Database", path: "/operations/customers", pro: false },
      { name: "Services", path: "/operations/services", pro: false }
    ],
    roles: ["admin"]
  },
  {
    icon: <UserCircleIcon />,
    name: "Workers",
    subItems: [
      { name: "Worker List", path: "/workers/list", pro: false },
      { name: "Add Worker", path: "/add-worker", pro: false }
    ],
    roles: ["admin"]
  },
  {
    icon: <DollarIcon />,
    name: "Financial",
    subItems: [
      { name: "Payment History", path: "/payments/history", pro: false },
      { name: "Payment Reports", path: "/payments/reports", pro: false },
      { name: "Payment Requests", path: "/payments/requests", pro: false },

    ],
    roles: ["admin"]
  },
  {
    icon: <ToolIcon />,
    name: "Tools & Equipment",
    subItems: [
      { name: "Tool Management", path: "/tools/management", pro: false },
      { name: "Tool Assignments", path: "/tools/assignments", pro: false },
      { name: "Lost Tool Charges", path: "/tools/charges", pro: false }
    ],
    roles: ["admin"]
  },
  {
    icon: <StockIcon />,
    name: "Stock",
    subItems: [
      { name: "Update Stock", path: "/stock/update", pro: false },
      { name: "Sales", path: "/sales", pro: false }
    ],
    roles: ["admin"]
  },
  {
    icon: <UserCircleIcon />,
    name: "Profile",
    subItems: [
      { name: "Change Password", path: "/change-password", pro: false }
    ],
    roles: ["admin"]
  }
];

// Car Washer Navigation Items
const washerItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
    roles: ["car_washer"]
  },
  {
    icon: <CheckLineIcon />,
    name: "My Check-ins",
    path: "/checkins/my-checkins",
    roles: ["car_washer"]
  },
  {
    icon: <DollarIcon />,
    name: "Payment Requests",
    path: "/payment-requests",
    roles: ["car_washer"]
  },
  {
   icon: <DollarIcon />,
   name: "Income History",
   path: "/income-history",
   roles: ["car_washer"]
  },
  {
   icon: <DollarIcon />,
   name: "My Bonuses",
   path: "/worker-bonuses",
   roles: ["car_washer"]
  },
  {
    icon: <ReportIcon />,
    name: "My Tools",
    path: "/tools/my-tools",
    roles: ["car_washer"]
  },
  {
    icon: <UserCircleIcon />,
    name: "My Profile",
    subItems: [
      { name: "Profile", path: "/profile/worker", pro: false },
      { name: "Change Password", path: "/profile/worker/change-password", pro: false }
    ],
    roles: ["car_washer"]
  }
];

const CarWashSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const { user, hasRole } = useAuth();

  // Get navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (hasRole('super_admin')) {
      return superAdminItems;
    } else if (hasRole('admin')) {
      return adminItems;
    } else if (hasRole('car_washer')) {
      return washerItems;
    }
    return [];
  };

  const navItems = getNavItems();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // Function to handle link clicks and close mobile sidebar
  const handleLinkClick = useCallback(() => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  }, [isMobileOpen, toggleMobileSidebar]);

  const renderMenuItems = (navItems: NavItem[], menuType: "main") => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "rotate-180 text-green-light-600 dark:text-green-light-300"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                onClick={handleLinkClick}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9 border-l-2 border-green-light-200 dark:border-green-light-700/40 pl-4">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      onClick={handleLinkClick}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              index,
            });
            submenuMatched = true;
          }
        });
      }
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, navItems]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  if (!user) return null;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" onClick={handleLinkClick}>
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-light-600 rounded-lg flex items-center justify-center">
                <CarIcon />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                AACC
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-green-light-600 rounded-lg flex items-center justify-center">
              <CarIcon />
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default CarWashSidebar; 