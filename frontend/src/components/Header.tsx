
import { useDispatch, useSelector } from 'react-redux'
import { collapsedSidebar, toggleSidebar } from '../provider/slice/Sidebar.slice';
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { IoLogOutOutline } from "react-icons/io5";
import { removeUser, UserSlicePath } from '../provider/slice/user.slice';
import { useNavigate } from 'react-router-dom';
import { LuWarehouse } from "react-icons/lu";

const Header = () => {

  const dispatch = useDispatch();
  const user = useSelector(UserSlicePath) as { email?: string; role?: string } | null

  const sidebarHandler = () => dispatch(collapsedSidebar())
  const sidebarHandlerToggle = () => dispatch(toggleSidebar())
  const navigate = useNavigate()

  const logoutHandler = () => {
    try {
      localStorage.removeItem('token')
      dispatch(removeUser())
      navigate("/login");
    } catch (error: any) {
      console.log(error.message)
    }
  }

  return (
    <>
      <header className="py-3 px-4 md:px-8 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="nav flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className='lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors' onClick={sidebarHandlerToggle}><HiOutlineMenuAlt3 className='text-2xl text-gray-600' /></button>
            <button className='hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors' onClick={sidebarHandler}><HiOutlineMenuAlt3 className='text-2xl text-gray-600' /></button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <LuWarehouse className="text-white text-sm" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent hidden sm:inline">
                WMS
              </span>
            </div>
          </div>
          <div className="end flex items-center gap-3">
            {user?.email && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-700 font-medium text-xs">{user.email}</span>
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider">{user.role}</span>
                </div>
              </div>
            )}
            <button title='logout' className='p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors' onClick={logoutHandler}><IoLogOutOutline className='text-xl' /></button>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header