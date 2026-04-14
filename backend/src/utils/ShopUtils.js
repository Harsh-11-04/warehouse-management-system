const { UserModel } = require('../models');

class ShopUtils {
    static async getShopUserIds(userId) {
        const user = await UserModel.findById(userId).select('shopId');
        if (user && user.shopId) {
            const users = await UserModel.find({ shopId: user.shopId }).select('_id');
            return users.map(u => u._id);
        }
        return [userId];
    }
}

module.exports = ShopUtils;
