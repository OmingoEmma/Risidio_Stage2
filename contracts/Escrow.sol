// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
    enum Status {
        None,
        Funded,
        Released,
        Refunded,
        Expired
    }

    struct Deal {
        address buyer;
        address seller;
        uint256 amount;
        uint256 deadline; // unix timestamp
        Status status;
    }

    uint256 public nextId;
    mapping(uint256 => Deal) public deals;

    event Funded(uint256 indexed id, address indexed buyer, address indexed seller, uint256 amount, uint256 deadline);
    event Released(uint256 indexed id, address indexed seller);
    event Refunded(uint256 indexed id, address indexed buyer);
    event Expired(uint256 indexed id);

    function createEscrow(address seller, uint256 timeoutSecs) external payable nonReentrant returns (uint256 id) {
        require(msg.value > 0, "Zero amount");
        require(seller != address(0), "Invalid seller");

        id = nextId;
        nextId = id + 1;

        uint256 deadline = block.timestamp + timeoutSecs;
        deals[id] = Deal({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            deadline: deadline,
            status: Status.Funded
        });

        emit Funded(id, msg.sender, seller, msg.value, deadline);
    }

    function releaseToSeller(uint256 id) external nonReentrant {
        Deal storage deal = deals[id];
        require(deal.status == Status.Funded, "Not funded");
        require(msg.sender == deal.buyer, "Only buyer");

        deal.status = Status.Released; // Effects before interaction

        (bool ok, ) = deal.seller.call{value: deal.amount}("");
        require(ok, "Transfer failed");

        emit Released(id, deal.seller);
    }

    function refundToBuyer(uint256 id) external nonReentrant {
        Deal storage deal = deals[id];
        require(deal.status == Status.Funded || deal.status == Status.Expired, "Invalid status");

        if (deal.status == Status.Funded) {
            require(msg.sender == deal.buyer || msg.sender == deal.seller, "Only party");
        } else {
            // Expired path
            require(msg.sender == deal.buyer, "Only buyer after expire");
        }

        deal.status = Status.Refunded; // Effects before interaction

        (bool ok, ) = deal.buyer.call{value: deal.amount}("");
        require(ok, "Transfer failed");

        emit Refunded(id, deal.buyer);
    }

    function expire(uint256 id) external {
        Deal storage deal = deals[id];
        require(deal.status == Status.Funded, "Not active");
        require(block.timestamp > deal.deadline, "Not past deadline");
        require(msg.sender == deal.buyer || msg.sender == deal.seller, "Only party");

        deal.status = Status.Expired;
        emit Expired(id);
    }

    function getDeal(uint256 id) external view returns (Deal memory) {
        return deals[id];
    }
}