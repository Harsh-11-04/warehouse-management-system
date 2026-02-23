
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { useDispatch, useSelector } from 'react-redux';
import { SidebarSlicePath, toggleSidebar } from '../provider/slice/Sidebar.slice';
import { UserSlicePath } from '../provider/slice/user.slice';
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { FiUser } from "react-icons/fi";
import { IoIosArrowDropright, IoIosArrowDropleft } from "react-icons/io";
import { FiBox } from "react-icons/fi";
import { BsBoxes } from "react-icons/bs";
import { LuWarehouse } from "react-icons/lu";
import { TbMapPin } from "react-icons/tb";
import { MdOutlineAssignment } from "react-icons/md";
import { BiTransfer } from "react-icons/bi";
import { TbTruckDelivery, TbReportAnalytics, TbActivity } from "react-icons/tb";
import { Link } from 'react-router-dom';
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const selector = useSelector(SidebarSlicePath)
  const user = useSelector(UserSlicePath) as { role?: string } | null
  const role = user?.role || 'warehouse_staff'
  const canViewReports = ['admin', 'manager'].includes(role)
  const dispatch = useDispatch()



  return (
    <>

      <div className="flex items-start lg:gap-x-2">
        <Sidebar collapsed={selector.collapsed} breakPoint="lg" toggled={selector.toggle} >
          <Menu >
            <MenuItem className="lg:hidden" onClick={() => dispatch(toggleSidebar())} > {selector.toggle ? <IoIosArrowDropright className="text-2xl" /> : <IoIosArrowDropleft className="text-2xl" />} </MenuItem>

            <MenuItem component={<Link to="/" />} icon={<MdOutlineSpaceDashboard className="text-2xl" />} > Dashboard </MenuItem>

            <MenuItem component={<Link to="/orders" />} icon={<FiBox className="text-2xl" />}> Orders </MenuItem>

            <MenuItem component={<Link to="/user" />} icon={<FiUser className="text-2xl" />} > Users </MenuItem>

            <SubMenu label="Warehouse" icon={<LuWarehouse className="text-2xl" />}>
              <MenuItem component={<Link to="/products" />} icon={<BsBoxes className="text-xl" />}> Products </MenuItem>
              <MenuItem component={<Link to="/warehouses" />} icon={<LuWarehouse className="text-xl" />}> Warehouses </MenuItem>
              <MenuItem component={<Link to="/stock-assign" />} icon={<MdOutlineAssignment className="text-xl" />}> Assign / Receive </MenuItem>
              <MenuItem component={<Link to="/warehouse-stock" />} icon={<TbMapPin className="text-xl" />}> Stock View </MenuItem>
              <MenuItem component={<Link to="/picking" />} icon={<BiTransfer className="text-xl" />}> Pick / Transfer </MenuItem>
              <MenuItem component={<Link to="/shipments" />} icon={<TbTruckDelivery className="text-xl" />}> Shipments </MenuItem>
            </SubMenu>

            {canViewReports && (
              <>
                <MenuItem component={<Link to="/reports" />} icon={<TbReportAnalytics className="text-2xl" />}> Reports </MenuItem>
                <MenuItem component={<Link to="/activity-logs" />} icon={<TbActivity className="text-2xl" />}> Activity Logs </MenuItem>
              </>
            )}
          </Menu>
        </Sidebar>
        <div className="w-full">
          {children}
        </div>


      </div>
    </>
  )
}

export default MainLayout